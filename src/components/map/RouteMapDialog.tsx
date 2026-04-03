import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Footprints, Bike, Car, Navigation } from 'lucide-react';
import { useGeolocation, type LatLng } from '@/hooks/useGeolocation';
import type { TransportMode } from './RouteMap';
import RouteMap from './RouteMap';

interface RouteMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinationAddress?: string;
  destinationCoords?: LatLng;
  originLabel: string;
  destinationLabel: string;
}

interface RouteInfo {
  distance: number;
  duration: number;
}

const TRANSPORT_MODES: { mode: TransportMode; icon: typeof Footprints; labelKey: string }[] = [
  { mode: 'foot', icon: Footprints, labelKey: 'map.walking' },
  { mode: 'bike', icon: Bike, labelKey: 'map.cycling' },
  { mode: 'car', icon: Car, labelKey: 'map.driving' },
];

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

// Geocode an address using Nominatim
async function geocodeAddress(address: string): Promise<LatLng | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await res.json();
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

export default function RouteMapDialog({
  open,
  onOpenChange,
  destinationAddress,
  destinationCoords,
  originLabel,
  destinationLabel,
}: RouteMapDialogProps) {
  const { t } = useTranslation();
  const { position, isLoading: geoLoading, requestPosition, error: geoError } = useGeolocation();
  const [mode, setMode] = useState<TransportMode>('car');
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [destCoords, setDestCoords] = useState<LatLng | null>(destinationCoords || null);
  const [geocoding, setGeocoding] = useState(false);

  // Request geolocation when dialog opens
  useEffect(() => {
    if (open && !position) {
      requestPosition();
    }
  }, [open, position, requestPosition]);

  // Geocode destination address if no coords provided
  useEffect(() => {
    if (open && !destinationCoords && destinationAddress) {
      setGeocoding(true);
      geocodeAddress(destinationAddress).then((coords) => {
        setDestCoords(coords);
        setGeocoding(false);
      });
    } else if (destinationCoords) {
      setDestCoords(destinationCoords);
    }
  }, [open, destinationAddress, destinationCoords]);

  const isReady = position && destCoords && !geoLoading && !geocoding;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            {t('map.routeTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4 flex-1 overflow-auto">
          {/* Transport mode selector */}
          <div className="flex gap-2">
            {TRANSPORT_MODES.map(({ mode: m, icon: Icon, labelKey }) => (
              <Button
                key={m}
                variant={mode === m ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode(m)}
                className="flex items-center gap-1.5"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t(labelKey)}</span>
              </Button>
            ))}
          </div>

          {/* Route info badges */}
          {routeInfo && (
            <div className="flex gap-3">
              <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {formatDistance(routeInfo.distance)}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5">
                🕐 {formatDuration(routeInfo.duration)}
              </Badge>
            </div>
          )}

          {/* Map area */}
          <div className="h-[400px] rounded-lg overflow-hidden border">
            {geoLoading || geocoding ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm">{t('map.locating')}</p>
              </div>
            ) : geoError && !position ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-6 text-center">
                <MapPin className="w-8 h-8" />
                <p className="text-sm">{t('map.locationError')}</p>
                <Button size="sm" onClick={requestPosition}>{t('map.tryAgain')}</Button>
              </div>
            ) : !destCoords ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <MapPin className="w-8 h-8" />
                <p className="text-sm">{t('map.destinationNotFound')}</p>
              </div>
            ) : isReady ? (
              <RouteMap
                origin={position}
                destination={destCoords}
                originLabel={originLabel}
                destinationLabel={destinationLabel}
                mode={mode}
                onRouteInfo={setRouteInfo}
              />
            ) : null}
          </div>

          {/* Location labels */}
          {isReady && (
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-primary mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">{t('map.yourLocation')}</span>
                  <span className="text-muted-foreground ml-1">({originLabel})</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">{t('map.destination')}</span>
                  <span className="text-muted-foreground ml-1">({destinationLabel})</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
