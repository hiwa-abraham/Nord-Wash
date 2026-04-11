-- Drop the overly permissive ALL policy on audit_logs
DROP POLICY IF EXISTS "Block anonymous access to audit_logs" ON public.audit_logs;