import { useEffect, useRef } from 'react';
import { useApiIsLoaded } from '@vis.gl/react-google-maps';

interface Props {
  onSelect: (address: string, placeId: string) => void;
}

export function LocationInput({ onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const apiLoaded = useApiIsLoaded();

  useEffect(() => {
    if (!apiLoaded || !inputRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'au' },
      fields: ['formatted_address', 'place_id', 'name'],
      types: ['geocode', 'establishment'],
    });

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.place_id) {
        onSelect(
          place.formatted_address ?? place.name ?? '',
          place.place_id
        );
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [apiLoaded, onSelect]);

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <span className="text-lg">🗺️</span>
      </div>
      <input
        ref={inputRef}
        type="text"
        placeholder="Where are you going?"
        className="w-full pl-12 pr-4 py-4 border border-ink-700 rounded-2xl text-sm font-medium placeholder-ink-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
        style={{ backgroundColor: '#1A1A1A', color: '#F2F2F2' }}
        autoComplete="off"
      />
    </div>
  );
}
