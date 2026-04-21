-- 1. Add geocoded coordinates to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pickup_latitude numeric,
  ADD COLUMN IF NOT EXISTS pickup_longitude numeric;

-- 2. Add per-service currency
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'SEK';

-- 3. Seed deployment country/currency setting (Sweden default)
INSERT INTO public.settings (key, value, description)
VALUES (
  'deployment_country',
  '{"code": "SE", "currency": "SEK", "name": "Sweden"}'::jsonb,
  'Single deployment country and its local currency'
)
ON CONFLICT (key) DO NOTHING;

-- 4. Exchange rates cache table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL,
  rates jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE UNIQUE INDEX IF NOT EXISTS exchange_rates_base_unique
  ON public.exchange_rates (base_currency);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read cached rates
CREATE POLICY "Anyone can view exchange rates"
  ON public.exchange_rates
  FOR SELECT
  USING (true);

-- Only service role (edge functions) can write — no insert/update/delete policies for normal users

-- Add unique constraint on settings.key if not present (for the ON CONFLICT above to work going forward)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'settings_key_unique'
  ) THEN
    ALTER TABLE public.settings ADD CONSTRAINT settings_key_unique UNIQUE (key);
  END IF;
END $$;