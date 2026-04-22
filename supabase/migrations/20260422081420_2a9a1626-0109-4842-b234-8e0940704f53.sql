
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.issue_priority AS ENUM ('critical','high','medium','low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.issue_status AS ENUM ('open','in_progress','resolved','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ ADMIN SETTINGS ============
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- ============ ISSUES ============
CREATE TABLE IF NOT EXISTS public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority public.issue_priority NOT NULL DEFAULT 'medium',
  status public.issue_status NOT NULL DEFAULT 'open',
  source text NOT NULL DEFAULT 'user' CHECK (source IN ('user','internal')),
  reporter_id uuid,
  reporter_email text,
  assigned_to uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_issues_priority_status ON public.issues(priority, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_reporter ON public.issues(reporter_id);

-- ============ ADMIN ACTION LOGS ============
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON public.admin_action_logs(created_at DESC);

-- ============ SUSPENDED USERS ============
CREATE TABLE IF NOT EXISTS public.suspended_users (
  user_id uuid PRIMARY KEY,
  reason text,
  suspended_by uuid NOT NULL,
  suspended_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suspended_users ENABLE ROW LEVEL SECURITY;

-- ============ FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.is_owner_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner_admin')
$$;

CREATE OR REPLACE FUNCTION public.get_owner_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (value #>> '{}')::text FROM public.admin_settings WHERE key = 'owner_email'
$$;

CREATE OR REPLACE FUNCTION public.is_user_suspended(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.suspended_users WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.get_maintenance_mode()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((value)::boolean, false) FROM public.admin_settings WHERE key = 'maintenance_mode'
$$;

CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text, _target_type text DEFAULT NULL, _target_id text DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.is_owner_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only owner_admin can log admin actions';
  END IF;
  INSERT INTO public.admin_action_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), _action, _target_type, _target_id, _metadata)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

-- Enforce only ONE owner_admin
CREATE OR REPLACE FUNCTION public.enforce_single_owner_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'owner_admin' THEN
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner_admin' AND user_id <> NEW.user_id) THEN
      RAISE EXCEPTION 'Only one owner_admin can exist in the system';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_single_owner_admin ON public.user_roles;
CREATE TRIGGER trg_single_owner_admin
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_owner_admin();

-- Auto-promote allowlisted email on signup
CREATE OR REPLACE FUNCTION public.auto_promote_owner_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_email text;
BEGIN
  SELECT public.get_owner_email() INTO owner_email;
  IF owner_email IS NOT NULL AND lower(NEW.email) = lower(owner_email) THEN
    -- remove any other role for this user, then assign owner_admin
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner_admin')
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_promote_owner ON auth.users;
CREATE TRIGGER trg_auto_promote_owner
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_promote_owner_admin();

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_issues_updated_at ON public.issues;
CREATE TRIGGER trg_issues_updated_at BEFORE UPDATE ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_admin_settings_updated_at ON public.admin_settings;
CREATE TRIGGER trg_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS POLICIES ============

-- admin_settings: public can read 'maintenance_mode' only; owner can read/write all
CREATE POLICY "Public can read maintenance flag" ON public.admin_settings
FOR SELECT USING (key = 'maintenance_mode');

CREATE POLICY "Owner can read all settings" ON public.admin_settings
FOR SELECT USING (public.is_owner_admin(auth.uid()));

CREATE POLICY "Owner can insert settings" ON public.admin_settings
FOR INSERT WITH CHECK (public.is_owner_admin(auth.uid()));

CREATE POLICY "Owner can update settings" ON public.admin_settings
FOR UPDATE USING (public.is_owner_admin(auth.uid()));

-- issues: any authenticated user can create issues for themselves; owner sees/manages all; users see their own
CREATE POLICY "Block anon issues" ON public.issues AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create own issues" ON public.issues
FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users see own issues" ON public.issues
FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Owner sees all issues" ON public.issues
FOR SELECT USING (public.is_owner_admin(auth.uid()));

CREATE POLICY "Owner can insert any issue" ON public.issues
FOR INSERT WITH CHECK (public.is_owner_admin(auth.uid()));

CREATE POLICY "Owner can update issues" ON public.issues
FOR UPDATE USING (public.is_owner_admin(auth.uid()));

CREATE POLICY "Owner can delete issues" ON public.issues
FOR DELETE USING (public.is_owner_admin(auth.uid()));

-- admin_action_logs: owner read only; insert via security-definer function
CREATE POLICY "Owner reads logs" ON public.admin_action_logs
FOR SELECT USING (public.is_owner_admin(auth.uid()));

-- suspended_users: owner only
CREATE POLICY "Owner reads suspensions" ON public.suspended_users
FOR SELECT USING (public.is_owner_admin(auth.uid()));
CREATE POLICY "Owner inserts suspensions" ON public.suspended_users
FOR INSERT WITH CHECK (public.is_owner_admin(auth.uid()));
CREATE POLICY "Owner deletes suspensions" ON public.suspended_users
FOR DELETE USING (public.is_owner_admin(auth.uid()));

-- ============ SEED ============
INSERT INTO public.admin_settings (key, value, updated_at)
VALUES
  ('owner_email', '"admin@test.local"'::jsonb, now()),
  ('maintenance_mode', 'false'::jsonb, now())
ON CONFLICT (key) DO NOTHING;

-- Promote existing user if matching email already exists
DO $$
DECLARE existing_uid uuid;
BEGIN
  SELECT id INTO existing_uid FROM auth.users WHERE lower(email) = 'admin@test.local' LIMIT 1;
  IF existing_uid IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = existing_uid;
    INSERT INTO public.user_roles (user_id, role) VALUES (existing_uid, 'owner_admin')
      ON CONFLICT DO NOTHING;
  END IF;
END $$;
