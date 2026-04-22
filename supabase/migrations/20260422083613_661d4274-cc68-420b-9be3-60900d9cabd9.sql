DROP POLICY IF EXISTS "Admin level can view audit logs" ON public.audit_logs;
CREATE POLICY "Owner can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.is_owner_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin level can update security events" ON public.security_events;
DROP POLICY IF EXISTS "Admin level can view security events" ON public.security_events;
CREATE POLICY "Owner can update security events"
ON public.security_events
FOR UPDATE
USING (public.is_owner_admin(auth.uid()));
CREATE POLICY "Owner can view security events"
ON public.security_events
FOR SELECT
USING (public.is_owner_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin level can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admin level can update all orders" ON public.orders;
CREATE POLICY "Owner can view all orders"
ON public.orders
FOR SELECT
USING (public.is_owner_admin(auth.uid()));
CREATE POLICY "Owner can update all orders"
ON public.orders
FOR UPDATE
USING (public.is_owner_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin level can create services" ON public.services;
DROP POLICY IF EXISTS "Admin level can delete services" ON public.services;
DROP POLICY IF EXISTS "Admin level can update services" ON public.services;
DROP POLICY IF EXISTS "Admin level can view all services" ON public.services;
CREATE POLICY "Owner can create services"
ON public.services
FOR INSERT
WITH CHECK (public.is_owner_admin(auth.uid()));
CREATE POLICY "Owner can delete services"
ON public.services
FOR DELETE
USING (public.is_owner_admin(auth.uid()));
CREATE POLICY "Owner can update services"
ON public.services
FOR UPDATE
USING (public.is_owner_admin(auth.uid()));
CREATE POLICY "Owner can view all services"
ON public.services
FOR SELECT
USING (public.is_owner_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin level can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Admin level can update settings" ON public.settings;
CREATE POLICY "Owner can insert settings"
ON public.settings
FOR INSERT
WITH CHECK (public.is_owner_admin(auth.uid()));
CREATE POLICY "Owner can update settings"
ON public.settings
FOR UPDATE
USING (public.is_owner_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin level can view all profiles" ON public.profiles;
CREATE POLICY "Owner can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_owner_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin level can view all roles" ON public.user_roles;
CREATE POLICY "Owner can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_owner_admin(auth.uid()));