/**
 * GoogleListingsMap — multi-marker Google Map for a list of listings/orders.
 * - Auto-fits bounds to all markers
 * - Falls back to a configurable city center if no listings have coords
 * - Click a marker to open a popup with title, price, image, short description
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import PriceDisplay from '@/components/PriceDisplay';

export interface MapListing {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price: number;
  currency: string;
  lat?: number | null;
  lng?: number | null;
}

interface GoogleListingsMapProps {
  listings: MapListing[];
  fallbackCenter?: { lat: number; lng: number };
  height?: number;
  selectedId?: string | null;
}

const GOOGLE_KEY = (import.meta as { env: Record<string, string> }).env.VITE_GOOGLE_MAPS_BROWSER_KEY || '';
const MAP_ID = 'nordwash-listings-map';
// Stockholm city center as a sensible default for the SE deployment
const DEFAULT_FALLBACK = { lat: 59.3293, lng: 18.0686 };

function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 60);
  }, [map, points]);
  return null;
}

export default function GoogleListingsMap({
  listings,
  fallbackCenter = DEFAULT_FALLBACK,
  height = 420,
  selectedId,
}: GoogleListingsMapProps) {
  const [openId, setOpenId] = useState<string | null>(selectedId ?? null);
  const initialized = useRef(false);

  const valid = useMemo(
    () =>
      listings.filter(
        (l): l is MapListing & { lat: number; lng: number } =>
          typeof l.lat === 'number' && typeof l.lng === 'number'
      ),
    [listings]
  );

  useEffect(() => {
    if (selectedId !== undefined) setOpenId(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!initialized.current && valid.length > 0) initialized.current = true;
  }, [valid]);

  if (!GOOGLE_KEY) {
    return (
      <div
        className="w-full rounded-lg border border-border bg-muted/30 flex flex-col items-center justify-center gap-2 text-muted-foreground p-6 text-center"
        style={{ height }}
      >
        <MapPin className="w-6 h-6" />
        <p className="text-sm font-medium">Map unavailable</p>
        <p className="text-xs">Google Maps browser key (VITE_GOOGLE_MAPS_BROWSER_KEY) not configured.</p>
      </div>
    );
  }

  const center = valid[0] ? { lat: valid[0].lat, lng: valid[0].lng } : fallbackCenter;

  return (
    <div className="w-full rounded-lg overflow-hidden border border-border" style={{ height }}>
      <APIProvider apiKey={GOOGLE_KEY}>
        <Map
          mapId={MAP_ID}
          defaultCenter={center}
          defaultZoom={valid.length === 0 ? 11 : 13}
          gestureHandling="greedy"
        >
          <FitBounds points={valid.map((l) => ({ lat: l.lat, lng: l.lng }))} />

          {valid.map((l) => (
            <AdvancedMarker
              key={l.id}
              position={{ lat: l.lat, lng: l.lng }}
              onClick={() => setOpenId(l.id)}
              title={l.title}
            >
              <Pin
                background="hsl(var(--primary))"
                borderColor="hsl(var(--primary))"
                glyphColor="white"
              />
            </AdvancedMarker>
          ))}

          {openId &&
            (() => {
              const l = valid.find((x) => x.id === openId);
              if (!l) return null;
              return (
                <InfoWindow
                  position={{ lat: l.lat, lng: l.lng }}
                  onCloseClick={() => setOpenId(null)}
                  pixelOffset={[0, -40]}
                >
                  <div className="min-w-[200px] max-w-[260px] space-y-2 p-1">
                    {l.imageUrl && (
                      <img
                        src={l.imageUrl}
                        alt={l.title}
                        className="w-full h-24 object-cover rounded"
                      />
                    )}
                    <h4 className="font-semibold text-sm leading-tight text-foreground">
                      {l.title}
                    </h4>
                    {l.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {l.description}
                      </p>
                    )}
                    <div className="text-base font-bold text-primary">
                      <PriceDisplay amount={l.price} currency={l.currency} />
                    </div>
                  </div>
                </InfoWindow>
              );
            })()}
        </Map>
      </APIProvider>
    </div>
  );
}
