// Edge function: geocode an address using Google Maps Geocoding API
// Falls back to Nominatim if no Google key is configured.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address?: string;
  country_code?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    if (!address || typeof address !== 'string' || address.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'address required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleKey = Deno.env.get('GOOGLE_MAPS_SERVER_KEY');
    let result: GeocodeResult | null = null;

    if (googleKey) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.results?.[0]) {
        const r = data.results[0];
        const country = r.address_components?.find((c: { types: string[]; short_name: string }) =>
          c.types.includes('country')
        )?.short_name;
        result = {
          lat: r.geometry.location.lat,
          lng: r.geometry.location.lng,
          formatted_address: r.formatted_address,
          country_code: country,
        };
      }
    }

    // Fallback: Nominatim (free, no key)
    if (!result) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'NordWash/1.0' } });
      const data = await res.json();
      if (data?.[0]) {
        result = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          formatted_address: data[0].display_name,
          country_code: data[0].address?.country_code?.toUpperCase(),
        };
      }
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'No results' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
