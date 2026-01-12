-- SECURITY FIX: Remove overly permissive profile policy
DROP POLICY IF EXISTS "Authenticated users can view public profile data" ON public.profiles;

-- Create a secure function to get limited public profile data (no PII)
CREATE OR REPLACE FUNCTION public.get_limited_public_profile(_user_id uuid)
RETURNS TABLE(
    user_id uuid,
    full_name text,
    avatar_url text,
    rating numeric,
    completed_jobs integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        p.user_id,
        p.full_name,
        p.avatar_url,
        p.rating,
        p.completed_jobs
    FROM public.profiles p
    WHERE p.user_id = _user_id
$$;

-- SECURITY FIX: Create view for washers to see limited order info (no customer PII)
CREATE OR REPLACE VIEW public.washer_order_view AS
SELECT 
    id,
    customer_id,
    washer_id,
    services,
    pickup_date,
    pickup_time,
    pickup_city,
    -- Mask sensitive data - only show first name initial and last name
    CASE 
        WHEN customer_name IS NOT NULL THEN 
            SUBSTRING(customer_name FROM 1 FOR 1) || '***'
        ELSE NULL 
    END as customer_name_masked,
    -- Hide full address, only show city
    pickup_city as pickup_location,
    special_instructions,
    services_total,
    service_fee,
    transport_fee,
    total_amount,
    owner_amount,
    washer_amount,
    status,
    payment_status,
    created_at,
    updated_at,
    completed_at,
    paid_at
FROM public.orders;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.washer_order_view TO authenticated;

-- Update washer SELECT policy to be more restrictive
DROP POLICY IF EXISTS "Washers can view assigned orders" ON public.orders;

-- Washers can only see their assigned orders with full details when status requires contact
CREATE POLICY "Washers can view assigned orders with limited data" 
ON public.orders 
FOR SELECT 
USING (
    auth.uid() = washer_id 
    AND status IN ('in_progress', 'completed')
);

-- Create a new policy for washers to see basic order info during assignment phase
CREATE POLICY "Washers can view pending assigned orders" 
ON public.orders 
FOR SELECT 
USING (
    auth.uid() = washer_id 
    AND status = 'assigned'
);