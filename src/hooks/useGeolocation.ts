import { useState, useEffect } from 'react';
import type { LatLng } from '../types';

interface GeolocationState {
  location: LatLng | null;
  error: 'denied' | 'unavailable' | null;
  loading: boolean;
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ location: null, error: 'unavailable', loading: false });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
          loading: false,
        });
      },
      (err) => {
        setState({
          location: null,
          error: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
          loading: false,
        });
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }, []);

  return state;
}
