import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

interface MiniLocationMapProps {
  address: string;
  label?: string;
}

export default function MiniLocationMap({ address, label }: MiniLocationMapProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const geocode = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
        );
        const data = await res.json();
        if (data?.[0]) {
          setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
    };
    geocode();
  }, [address]);

  if (error || !coords) {
    return null;
  }

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.005},${coords.lat - 0.003},${coords.lng + 0.005},${coords.lat + 0.003}&layer=mapnik&marker=${coords.lat},${coords.lng}`;

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>{label}</span>
        </div>
      )}
      <div className="w-full h-[200px] rounded-lg overflow-hidden border border-border">
        <iframe
          src={mapUrl}
          className="w-full h-full border-0"
          loading="lazy"
          title={`Map showing ${label || address}`}
        />
      </div>
    </div>
  );
}
