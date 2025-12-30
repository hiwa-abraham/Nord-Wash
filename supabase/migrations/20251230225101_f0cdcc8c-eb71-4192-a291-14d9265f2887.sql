-- ============================================
-- ORDERS TABLE
-- Stores pickup/laundry orders with payment details
-- ============================================
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  washer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Order details
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'assigned', 'in_progress', 'completed', 'cancelled')),
  
  -- Service items stored as JSONB
  services JSONB NOT NULL DEFAULT '[]',
  
  -- Pickup info
  pickup_date DATE NOT NULL,
  pickup_time TEXT NOT NULL,
  
  -- Contact info
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  pickup_city TEXT NOT NULL,
  pickup_postal_code TEXT,
  special_instructions TEXT,
  
  -- Pricing breakdown (in cents for accuracy)
  services_total INTEGER NOT NULL DEFAULT 0,
  service_fee INTEGER NOT NULL DEFAULT 500, -- $5.00 service fee
  transport_fee INTEGER NOT NULL DEFAULT 1000, -- $10.00 transport fee
  total_amount INTEGER NOT NULL DEFAULT 0,
  
  -- Payment distribution
  owner_amount INTEGER NOT NULL DEFAULT 0, -- service_fee + 10% of services
  washer_amount INTEGER NOT NULL DEFAULT 0, -- 90% of services + transport
  
  -- Payment info
  payment_method TEXT CHECK (payment_method IN ('card', 'bank_transfer')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed')),
  stripe_payment_intent_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Customers can view their own orders
CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id);

-- Customers can create orders
CREATE POLICY "Customers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Customers can update their own pending orders
CREATE POLICY "Customers can update own pending orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = customer_id AND status IN ('pending_payment', 'paid'));

-- Washers can view orders assigned to them
CREATE POLICY "Washers can view assigned orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = washer_id);

-- Washers can update orders assigned to them
CREATE POLICY "Washers can update assigned orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = washer_id AND status IN ('assigned', 'in_progress'));

-- Admins can view all orders (fixed argument order)
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all orders (fixed argument order)
CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Update timestamp trigger
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_washer ON public.orders(washer_id);
CREATE INDEX idx_orders_status ON public.orders(status);