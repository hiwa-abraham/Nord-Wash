-- Create settings table for admin-configurable values
CREATE TABLE public.settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value jsonb NOT NULL,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for checkout flow)
CREATE POLICY "Anyone can view settings"
  ON public.settings FOR SELECT
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON public.settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings"
  ON public.settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default fee values
INSERT INTO public.settings (key, value, description) VALUES
  ('service_fee', '5'::jsonb, 'Service fee charged on each order (in €)'),
  ('transport_fee', '10'::jsonb, 'Pickup/transport fee charged on each order (in €)');