-- Add explicit policies to block anonymous (unauthenticated) access to sensitive tables
-- This provides defense-in-depth by making security intent explicit

-- Block anonymous access to audit_logs (for all operations)
CREATE POLICY "Block anonymous access to audit_logs"
ON public.audit_logs
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Block anonymous access to profiles (for all operations)
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Block anonymous access to orders (for all operations)
CREATE POLICY "Block anonymous access to orders"
ON public.orders
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Also add protection to security_events table
CREATE POLICY "Block anonymous access to security_events"
ON public.security_events
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Also add protection to user_roles table
CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Also add protection to conversations table
CREATE POLICY "Block anonymous access to conversations"
ON public.conversations
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Also add protection to messages table
CREATE POLICY "Block anonymous access to messages"
ON public.messages
FOR ALL
USING (auth.uid() IS NOT NULL);