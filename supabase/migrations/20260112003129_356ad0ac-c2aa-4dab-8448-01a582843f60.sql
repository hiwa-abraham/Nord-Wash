-- Fix: Drop overly permissive INSERT policy
DROP POLICY IF EXISTS "Service role can insert events" ON public.security_events;

-- Create a function to log security events (uses service role context)
CREATE OR REPLACE FUNCTION public.log_security_event(
    _event_type text,
    _severity text,
    _description text,
    _user_id uuid DEFAULT NULL,
    _ip_address text DEFAULT NULL,
    _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_id uuid;
BEGIN
    INSERT INTO public.security_events (event_type, severity, description, user_id, ip_address, metadata)
    VALUES (_event_type, _severity, _description, _user_id, _ip_address, _metadata)
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$;

-- Grant execute to authenticated users (the function itself controls what gets inserted)
GRANT EXECUTE ON FUNCTION public.log_security_event TO authenticated;