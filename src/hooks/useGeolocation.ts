import { useState, useCallback } from 'react';

export interface LatLng {
  lat: number;
  lng: number;
}

interface GeolocationState {
  position: LatLng | null;
  error: string | null;
  isLoading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: false,
  });

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ position: null, error: 'Geolocation is not supported', isLoading: false });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
          isLoading: false,
        });
      },
      (err) => {
        setState({ position: null, error: err.message, isLoading: false });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return { ...state, requestPosition };
}
