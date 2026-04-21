/**
 * useDeploymentCurrency — fetches the deployment country/currency and live exchange rates.
 * Provides `convert(amount, fromCurrency)` which returns the local-currency equivalent.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { convertAmount, formatPrice } from '@/lib/currency';

interface DeploymentCountry {
  code: string;
  currency: string;
  name?: string;
}

const DEFAULT: DeploymentCountry = { code: 'SE', currency: 'SEK', name: 'Sweden' };

export function useDeploymentCurrency() {
  const [country, setCountry] = useState<DeploymentCountry>(DEFAULT);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRates = useCallback(async (base: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('fx-rates', {
        body: null,
        method: 'GET',
      } as never);
      // functions.invoke doesn't easily allow query params, so call directly:
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fx-rates?base=${base}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const json = await res.json();
      if (json?.rates) setRates(json.rates as Record<string, number>);
      void data; void error;
    } catch {
      setRates(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'deployment_country')
        .maybeSingle();
      const c = (data?.value as unknown as DeploymentCountry) || DEFAULT;
      if (!mounted) return;
      setCountry(c);
      await loadRates(c.currency);
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [loadRates]);

  const convert = useCallback(
    (amount: number, fromCurrency: string): number | null => {
      return convertAmount(amount, fromCurrency, country.currency, rates, country.currency);
    },
    [rates, country.currency]
  );

  const formatLocal = useCallback(
    (amount: number) => formatPrice(amount, country.currency),
    [country.currency]
  );

  return { country, rates, loading, convert, formatLocal };
}
