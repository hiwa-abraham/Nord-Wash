/**
 * GoogleLocationMap — single-marker Google Map for an order's pickup location.
 * Geocodes via the geocode-address edge function if no coords are passed.
 */
import { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GoogleLocationMapProps {
  address: string;
  label?: string;
  lat?: number | null;
  lng?: number | null;
  height?: number;
}

const GOOGLE_KEY = (import.meta as { env: Record<string, string> }).env.VITE_GOOGLE_MAPS_BROWSER_KEY || '';
const MAP_ID = 'nordwash-map';

export default function GoogleLocationMap({
  address,
  label,
  lat,
  lng,
  height = 220,
}: GoogleLocationMapProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    lat != null && lng != null ? { lat, lng } : null
  );
  const [loading, setLoading] = useState(coords === null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (coords) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke('geocode-address', {
          body: { address },
        });
        if (cancelled) return;
        if (fnErr || !data?.lat) {
          setError(true);
        } else {
          setCoords({ lat: data.lat, lng: data.lng });
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [address, coords]);

  if (loading) {
    return (
      <div
        className="w-full rounded-lg border border-border bg-muted/30 flex items-center justify-center"
        style={{ height }}
      >
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !coords) {
    return (
      <div
        className="w-full rounded-lg border border-border bg-muted/30 flex flex-col items-center justify-center gap-2 text-muted-foreground p-4 text-center"
        style={{ height }}
      >
        <MapPin className="w-5 h-5" />
        <p className="text-xs">{label || address}</p>
      </div>
    );
  }

  // No browser key: fall back to OpenStreetMap iframe so the map still renders.
  if (!GOOGLE_KEY) {
    const bbox = `${coords.lng - 0.005},${coords.lat - 0.003},${coords.lng + 0.005},${coords.lat + 0.003}`;
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${coords.lat},${coords.lng}`;
    return (
      <div className="w-full rounded-lg overflow-hidden border border-border" style={{ height }}>
        <iframe src={src} className="w-full h-full border-0" loading="lazy" title={label || address} />
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden border border-border" style={{ height }}>
      <APIProvider apiKey={GOOGLE_KEY}>
        <Map
          mapId={MAP_ID}
          defaultCenter={coords}
          defaultZoom={15}
          gestureHandling="cooperative"
          disableDefaultUI={false}
        >
          <AdvancedMarker position={coords} title={label || address}>
            <Pin background="hsl(var(--primary))" borderColor="hsl(var(--primary))" glyphColor="white" />
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
}
