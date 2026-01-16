-- =============================================
-- DATABASE SECURITY ENHANCEMENTS
-- =============================================

-- 1. Additional indexes for query performance (prevent DoS via slow queries)
-- Index on messages for faster conversation lookups
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC);

-- Index on conversations for participant lookups
CREATE INDEX IF NOT EXISTS idx_conversations_customer 
ON public.conversations(customer_id);

CREATE INDEX IF NOT EXISTS idx_conversations_washer 
ON public.conversations(washer_id);

-- Index on profiles for user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON public.profiles(user_id);

-- Index on user_roles for role checks
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
ON public.user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role 
ON public.user_roles(role);

-- Index on orders for date-based queries
CREATE INDEX IF NOT EXISTS idx_orders_pickup_date 
ON public.orders(pickup_date);

CREATE INDEX IF NOT EXISTS idx_orders_created_at 
ON public.orders(created_at DESC);

-- Index on settings for key lookups
CREATE INDEX IF NOT EXISTS idx_settings_key 
ON public.settings(key);

-- 2. Create audit log table for database operations
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for audit log queries
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_operation ON public.audit_logs(operation);

-- 3. Create audit logging function
CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    record_id UUID;
    old_data JSONB := NULL;
    new_data JSONB := NULL;
BEGIN
    -- Determine record ID and data based on operation
    IF TG_OP = 'DELETE' THEN
        record_id := OLD.id;
        old_data := to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        record_id := NEW.id;
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSE -- INSERT
        record_id := NEW.id;
        new_data := to_jsonb(NEW);
    END IF;
    
    -- Remove sensitive fields from logged data
    old_data := old_data - ARRAY['password', 'token', 'secret', 'api_key'];
    new_data := new_data - ARRAY['password', 'token', 'secret', 'api_key'];
    
    -- Insert audit log entry
    INSERT INTO public.audit_logs (
        table_name,
        operation,
        record_id,
        old_data,
        new_data,
        user_id,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        record_id,
        old_data,
        new_data,
        auth.uid(),
        now()
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 4. Add audit triggers to critical tables
CREATE TRIGGER audit_orders_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_profiles_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_user_roles_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_settings_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- 5. Create function to query with timeout (prevents long-running queries)
CREATE OR REPLACE FUNCTION public.safe_query_orders(
    _customer_id UUID DEFAULT NULL,
    _status TEXT DEFAULT NULL,
    _limit INTEGER DEFAULT 100
)
RETURNS SETOF public.orders
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '5s'
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.orders o
    WHERE ((_customer_id IS NULL) OR (o.customer_id = _customer_id))
      AND ((_status IS NULL) OR (o.status = _status))
    ORDER BY o.created_at DESC
    LIMIT _limit;
END;
$$;

-- 6. Create function to clean up old audit logs (retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.audit_logs
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;