import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import type { LatLng } from '@/hooks/useGeolocation';

export type TransportMode = 'foot' | 'bike' | 'car';

interface RouteInfo {
  distance: number;
  duration: number;
  geometry: [number, number][];
}

interface RouteMapProps {
  origin: LatLng;
  destination: LatLng;
  originLabel: string;
  destinationLabel: string;
  mode: TransportMode;
  onRouteInfo?: (info: RouteInfo | null) => void;
}

const OSRM_PROFILES: Record<TransportMode, string> = {
  foot: 'foot',
  bike: 'bike',
  car: 'car',
};

export default function RouteMap({
  origin,
  destination,
  originLabel,
  destinationLabel,
  mode,
  onRouteInfo,
}: RouteMapProps) {
  const [loading, setLoading] = useState(true);

  // Fetch route info for distance/duration
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const profile = OSRM_PROFILES[mode];
        const url = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.code === 'Ok' && data.routes?.[0]) {
          const r = data.routes[0];
          const coords: [number, number][] = r.geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );
          onRouteInfo?.({
            distance: r.distance,
            duration: r.duration,
            geometry: coords,
          });
        } else {
          onRouteInfo?.(null);
        }
      } catch {
        onRouteInfo?.(null);
      }
    };
    fetchRoute();
  }, [origin, destination, mode]);

  // Build an OpenStreetMap embed showing both markers
  const bbox = useMemo(() => {
    const minLat = Math.min(origin.lat, destination.lat);
    const maxLat = Math.max(origin.lat, destination.lat);
    const minLng = Math.min(origin.lng, destination.lng);
    const maxLng = Math.max(origin.lng, destination.lng);
    const padLat = Math.max((maxLat - minLat) * 0.3, 0.005);
    const padLng = Math.max((maxLng - minLng) * 0.3, 0.005);
    return `${minLng - padLng},${minLat - padLat},${maxLng + padLng},${maxLat + padLat}`;
  }, [origin, destination]);

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${destination.lat},${destination.lng}`;

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-border" style={{ minHeight: 300 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      <iframe
        src={mapUrl}
        className="w-full h-full border-0"
        style={{ minHeight: 300 }}
        loading="lazy"
        title={`Route from ${originLabel} to ${destinationLabel}`}
        onLoad={() => setLoading(false)}
      />
      <div className="absolute bottom-2 left-2 right-2 flex gap-2 text-xs">
        <span className="bg-background/90 backdrop-blur px-2 py-1 rounded shadow text-foreground">
          📍 {originLabel}
        </span>
        <span className="bg-background/90 backdrop-blur px-2 py-1 rounded shadow text-foreground">
          📌 {destinationLabel}
        </span>
      </div>
    </div>
  );
}
