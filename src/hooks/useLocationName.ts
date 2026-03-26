import { useState, useEffect } from 'react';
import { useApiIsLoaded } from '@vis.gl/react-google-maps';
import type { LatLng } from '../types';

/**
 * Reverse-geocodes a lat/lng to a human-readable suburb/locality name.
 * Returns null while loading or if geocoding fails.
 */
export function useLocationName(location: LatLng | null): string | null {
  const [name, setName] = useState<string | null>(null);
  const apiLoaded = useApiIsLoaded();

  useEffect(() => {
    if (!location || !apiLoaded) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location }, (results, status) => {
      if (status !== 'OK' || !results || results.length === 0) return;

      const components = results[0].address_components;

      // Prefer suburb → locality → administrative area
      const match =
        components.find((c) => c.types.includes('locality')) ??
        components.find((c) => c.types.includes('sublocality_level_1')) ??
        components.find((c) => c.types.includes('administrative_area_level_2'));

      setName(match?.long_name ?? results[0].formatted_address.split(',')[0]);
    });
  }, [location, apiLoaded]);

  return name;
}
