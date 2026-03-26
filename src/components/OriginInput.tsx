import { useEffect, useRef } from 'react';
import { useApiIsLoaded } from '@vis.gl/react-google-maps';
import type { LatLng } from '../types';

interface Props {
  /** Suburb name from reverse geocoding — pre-fills the input once GPS resolves. */
  defaultValue: string;
  /** Called when the user picks a different starting location. */
  onSelect: (address: string, latLng: LatLng) => void;
  /** Called when the user clicks the reset (📍) button. */
  onReset: () => void;
  /** Show the reset button when the user has overridden their GPS location. */
  isModified: boolean;
}

export function OriginInput({ defaultValue, onSelect, onReset, isModified }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const apiLoaded = useApiIsLoaded();

  // Pre-fill with the suburb name once GPS resolves (or when it changes).
  useEffect(() => {
    if (inputRef.current && !isModified) {
      inputRef.current.value = defaultValue;
    }
  }, [defaultValue, isModified]);

  // Attach Places Autocomplete.
  useEffect(() => {
    if (!apiLoaded || !inputRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'au' },
      fields: ['formatted_address', 'place_id', 'name', 'geometry'],
      types: ['geocode', 'establishment'],
    });

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const loc = place.geometry?.location;
      if (loc) {
        onSelect(
          place.formatted_address ?? place.name ?? '',
          { lat: loc.lat(), lng: loc.lng() }
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
        <span className="text-lg">📍</span>
      </div>
      <input
        ref={inputRef}
        type="text"
        placeholder="Your starting location…"
        className="w-full pl-12 pr-12 py-4 border border-ink-700 rounded-2xl text-sm font-medium placeholder-ink-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
        style={{ backgroundColor: '#1A1A1A', color: '#F2F2F2' }}
        autoComplete="off"
      />
      {isModified && (
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = defaultValue;
            onReset();
          }}
          className="absolute inset-y-0 right-3 flex items-center px-1 text-amber-500 hover:text-amber-400 transition-colors"
          title="Use my current location"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      )}
    </div>
  );
}
