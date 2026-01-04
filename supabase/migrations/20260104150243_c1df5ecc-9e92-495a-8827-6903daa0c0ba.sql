-- Create services table for pricing management
CREATE TABLE public.services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_per_kg INTEGER NOT NULL, -- Price in cents
    discount_percent INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Everyone can read services (customers, washers, admins)
CREATE POLICY "Anyone can view active services"
ON public.services
FOR SELECT
USING (is_active = true);

-- Admins can view all services (including inactive)
CREATE POLICY "Admins can view all services"
ON public.services
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only admins can insert new services
CREATE POLICY "Admins can create services"
ON public.services
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update services
CREATE POLICY "Admins can update services"
ON public.services
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete services
CREATE POLICY "Admins can delete services"
ON public.services
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default services (prices in cents)
INSERT INTO public.services (name, description, price_per_kg, discount_percent, is_active) VALUES
    ('Regular Wash', 'Standard washing for everyday clothes', 400, 0, true),
    ('Wash & Iron', 'Washing with professional ironing', 600, 10, true),
    ('Dry Cleaning', 'Delicate fabrics and special care items', 1200, 0, true),
    ('Iron Only', 'Professional ironing service', 300, 15, true),
    ('Express Service', 'Same day pickup and delivery', 1000, 0, true);