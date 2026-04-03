import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '@/hooks/useGeolocation';

// Fix default marker icons in Leaflet + Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const otherIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'hue-rotate-[120deg]',
});

export type TransportMode = 'foot' | 'bike' | 'car';

interface RouteInfo {
  distance: number; // meters
  duration: number; // seconds
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

function FitBounds({ origin, destination }: { origin: LatLng; destination: LatLng }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(
      [origin.lat, origin.lng],
      [destination.lat, destination.lng]
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, origin, destination]);
  return null;
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
  const [route, setRoute] = useState<[number, number][]>([]);

  const center = useMemo<[number, number]>(
    () => [(origin.lat + destination.lat) / 2, (origin.lng + destination.lng) / 2],
    [origin, destination]
  );

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
          setRoute(coords);
          onRouteInfo?.({
            distance: r.distance,
            duration: r.duration,
            geometry: coords,
          });
        } else {
          setRoute([]);
          onRouteInfo?.(null);
        }
      } catch {
        // Fallback: straight line
        setRoute([[origin.lat, origin.lng], [destination.lat, destination.lng]]);
        onRouteInfo?.(null);
      }
    };

    fetchRoute();
  }, [origin, destination, mode]);

  const routeColor = mode === 'foot' ? 'hsl(199, 89%, 48%)' : mode === 'bike' ? 'hsl(169, 80%, 42%)' : 'hsl(280, 70%, 55%)';

  return (
    <MapContainer center={center} zoom={13} className="w-full h-full rounded-lg" style={{ minHeight: 300 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds origin={origin} destination={destination} />
      <Marker position={[origin.lat, origin.lng]} icon={userIcon}>
        <Popup>{originLabel}</Popup>
      </Marker>
      <Marker position={[destination.lat, destination.lng]} icon={otherIcon}>
        <Popup>{destinationLabel}</Popup>
      </Marker>
      {route.length > 0 && (
        <Polyline positions={route} pathOptions={{ color: routeColor, weight: 5, opacity: 0.8 }} />
      )}
    </MapContainer>
  );
}
