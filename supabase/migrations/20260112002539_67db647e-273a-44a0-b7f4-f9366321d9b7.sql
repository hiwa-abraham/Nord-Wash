-- Fix: Drop the SECURITY DEFINER view and use proper RLS approach
DROP VIEW IF EXISTS public.washer_order_view;

-- Instead, washers will use the secure function to get order data they need
-- Create a function that returns only necessary order data for washers
CREATE OR REPLACE FUNCTION public.get_washer_order_info(_order_id uuid)
RETURNS TABLE(
    id uuid,
    services jsonb,
    pickup_date date,
    pickup_time text,
    pickup_city text,
    customer_name_initial text,
    special_instructions text,
    washer_amount integer,
    status text,
    created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        o.id,
        o.services,
        o.pickup_date,
        o.pickup_time,
        o.pickup_city,
        SUBSTRING(o.customer_name FROM 1 FOR 1) || '***' as customer_name_initial,
        o.special_instructions,
        o.washer_amount,
        o.status,
        o.created_at
    FROM public.orders o
    WHERE o.id = _order_id
      AND o.washer_id = auth.uid()
$$;

-- Function for washer to get full contact when order is in_progress (they need to pickup)
CREATE OR REPLACE FUNCTION public.get_washer_pickup_details(_order_id uuid)
RETURNS TABLE(
    id uuid,
    customer_name text,
    customer_phone text,
    pickup_address text,
    pickup_city text,
    pickup_postal_code text,
    pickup_date date,
    pickup_time text,
    special_instructions text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        o.id,
        o.customer_name,
        o.customer_phone,
        o.pickup_address,
        o.pickup_city,
        o.pickup_postal_code,
        o.pickup_date,
        o.pickup_time,
        o.special_instructions
    FROM public.orders o
    WHERE o.id = _order_id
      AND o.washer_id = auth.uid()
      AND o.status IN ('in_progress', 'assigned')
$$;