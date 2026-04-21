// Edge function: returns exchange rates for a base currency.
// Caches results in `exchange_rates` table for 24h.
// Uses exchangerate.host (free, no key required).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const base = (url.searchParams.get('base') || 'SEK').toUpperCase();
    if (!/^[A-Z]{3}$/.test(base)) {
      return new Response(JSON.stringify({ error: 'invalid base currency' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check cache
    const { data: cached } = await supabase
      .from('exchange_rates')
      .select('rates, fetched_at, expires_at')
      .eq('base_currency', base)
      .maybeSingle();

    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(
        JSON.stringify({ base, rates: cached.rates, cached: true, fetched_at: cached.fetched_at }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch fresh rates from exchangerate.host
    const apiUrl = `https://api.exchangerate.host/latest?base=${base}`;
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data?.rates) {
      // Fallback to cached even if expired
      if (cached) {
        return new Response(
          JSON.stringify({ base, rates: cached.rates, cached: true, stale: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ error: 'fx provider unavailable' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('exchange_rates').upsert(
      {
        base_currency: base,
        rates: data.rates,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: 'base_currency' }
    );

    return new Response(
      JSON.stringify({ base, rates: data.rates, cached: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
