-- Create security_events table to track security-related activities
CREATE TABLE public.security_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    severity text NOT NULL DEFAULT 'info',
    description text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address text,
    metadata jsonb DEFAULT '{}'::jsonb,
    acknowledged_at timestamptz,
    acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events"
ON public.security_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can acknowledge events
CREATE POLICY "Admins can update security events"
ON public.security_events
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert events (via service role in edge functions)
CREATE POLICY "Service role can insert events"
ON public.security_events
FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX idx_security_events_severity ON public.security_events(severity);
CREATE INDEX idx_security_events_type ON public.security_events(event_type);