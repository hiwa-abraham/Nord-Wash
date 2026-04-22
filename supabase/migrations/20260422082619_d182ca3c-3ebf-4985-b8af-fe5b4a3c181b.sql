CREATE OR REPLACE FUNCTION public.is_admin_level(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'owner_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.admin_issue_priority_weight(_priority public.issue_priority)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _priority
    WHEN 'critical' THEN 0
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    ELSE 3
  END
$$;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics()
RETURNS TABLE (
  total_users bigint,
  active_users_last_30_days bigint,
  new_orders_last_7_days bigint,
  open_issues bigint,
  revenue_paid_cents bigint,
  system_status text,
  failed_logins_last_24h bigint,
  suspicious_activity_last_24h bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.profiles),
    (SELECT COUNT(*) FROM public.profiles WHERE created_at >= now() - interval '30 days' OR updated_at >= now() - interval '30 days'),
    (SELECT COUNT(*) FROM public.orders WHERE created_at >= now() - interval '7 days'),
    (SELECT COUNT(*) FROM public.issues WHERE status IN ('open', 'in_progress')),
    (SELECT COALESCE(SUM(total_amount), 0) FROM public.orders WHERE payment_status = 'paid'),
    CASE
      WHEN public.get_maintenance_mode() THEN 'maintenance'
      WHEN EXISTS (
        SELECT 1 FROM public.security_events
        WHERE created_at >= now() - interval '24 hours'
          AND severity IN ('critical', 'error')
      ) THEN 'attention'
      ELSE 'healthy'
    END,
    (SELECT COUNT(*) FROM public.security_events WHERE created_at >= now() - interval '24 hours' AND event_type ILIKE '%login%' AND severity IN ('warning', 'error', 'critical')),
    (SELECT COUNT(*) FROM public.security_events WHERE created_at >= now() - interval '24 hours' AND (event_type ILIKE '%suspicious%' OR description ILIKE '%suspicious%' OR severity = 'critical'))
$$;

CREATE OR REPLACE FUNCTION public.delete_user_account(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_owner_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF public.is_owner_admin(_user_id) THEN
    RAISE EXCEPTION 'Cannot delete owner_admin account';
  END IF;

  DELETE FROM public.suspended_users WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role public.app_role)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_owner_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF public.is_owner_admin(_user_id) THEN
    RAISE EXCEPTION 'Cannot change owner_admin role';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
  RETURN _role;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_homepage_content(_hero_title text, _hero_subtitle text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_owner_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.settings (key, value, description)
  VALUES
    ('homepage_hero_title', to_jsonb(_hero_title), 'Owner managed homepage hero title'),
    ('homepage_hero_subtitle', to_jsonb(_hero_subtitle), 'Owner managed homepage hero subtitle')
  ON CONFLICT (key)
  DO UPDATE SET value = EXCLUDED.value, updated_at = now(), description = EXCLUDED.description;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'settings_key_unique'
      AND conrelid = 'public.settings'::regclass
  ) THEN
    ALTER TABLE public.settings
      ADD CONSTRAINT settings_key_unique UNIQUE (key);
  END IF;
END
$$;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admin level can view audit logs" ON public.audit_logs;
CREATE POLICY "Admin level can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.is_admin_level(auth.uid()));

DROP POLICY IF EXISTS "Admins can update security events" ON public.security_events;
DROP POLICY IF EXISTS "Admins can view security events" ON public.security_events;
DROP POLICY IF EXISTS "Admin level can update security events" ON public.security_events;
DROP POLICY IF EXISTS "Admin level can view security events" ON public.security_events;
CREATE POLICY "Admin level can update security events"
ON public.security_events
FOR UPDATE
USING (public.is_admin_level(auth.uid()));
CREATE POLICY "Admin level can view security events"
ON public.security_events
FOR SELECT
USING (public.is_admin_level(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "Admin level can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admin level can update all orders" ON public.orders;
CREATE POLICY "Admin level can view all orders"
ON public.orders
FOR SELECT
USING (public.is_admin_level(auth.uid()));
CREATE POLICY "Admin level can update all orders"
ON public.orders
FOR UPDATE
USING (public.is_admin_level(auth.uid()));

DROP POLICY IF EXISTS "Admins can create services" ON public.services;
DROP POLICY IF EXISTS "Admins can delete services" ON public.services;
DROP POLICY IF EXISTS "Admins can update services" ON public.services;
DROP POLICY IF EXISTS "Admins can view all services" ON public.services;
DROP POLICY IF EXISTS "Admin level can create services" ON public.services;
DROP POLICY IF EXISTS "Admin level can delete services" ON public.services;
DROP POLICY IF EXISTS "Admin level can update services" ON public.services;
DROP POLICY IF EXISTS "Admin level can view all services" ON public.services;
CREATE POLICY "Admin level can create services"
ON public.services
FOR INSERT
WITH CHECK (public.is_admin_level(auth.uid()));
CREATE POLICY "Admin level can delete services"
ON public.services
FOR DELETE
USING (public.is_admin_level(auth.uid()));
CREATE POLICY "Admin level can update services"
ON public.services
FOR UPDATE
USING (public.is_admin_level(auth.uid()));
CREATE POLICY "Admin level can view all services"
ON public.services
FOR SELECT
USING (public.is_admin_level(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
DROP POLICY IF EXISTS "Admin level can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Admin level can update settings" ON public.settings;
CREATE POLICY "Admin level can insert settings"
ON public.settings
FOR INSERT
WITH CHECK (public.is_admin_level(auth.uid()));
CREATE POLICY "Admin level can update settings"
ON public.settings
FOR UPDATE
USING (public.is_admin_level(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin level can view all profiles" ON public.profiles;
CREATE POLICY "Admin level can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin_level(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin level can view all roles" ON public.user_roles;
CREATE POLICY "Admin level can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin_level(auth.uid()));