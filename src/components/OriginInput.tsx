import { useEffect, useRef } from 'react';
import { useApiIsLoaded } from '@vis.gl/react-google-maps';
import type { LatLng } from '../types';

type GpsState = 'loading' | 'ok' | 'denied' | 'waiting';

interface Props {
  /** Suburb name from reverse geocoding — pre-fills the input once GPS resolves. */
  defaultValue: string;
  /** Called when the user picks a different starting location. */
  onSelect: (address: string, latLng: LatLng) => void;
  /** Called when the user clicks the reset (📍) button. */
  onReset: () => void;
  /** Show the reset button when the user has overridden their GPS location. */
  isModified: boolean;
  /** Current GPS permission/availability state. */
  gpsState?: GpsState;
}

export function OriginInput({ defaultValue, onSelect, onReset, isModified, gpsState = 'waiting' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const apiLoaded = useApiIsLoaded();

  // Pre-fill with the suburb name once GPS resolves (or when it changes).
  useEffect(() => {
    if (inputRef.current && !isModified) {
      inputRef.current.value = defaultValue;
    }
  }, [defaultValue, isModified]);

  // Auto-focus the input when GPS is denied so the user knows to type manually.
  useEffect(() => {
    if (gpsState === 'denied' && inputRef.current && !isModified) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  }, [gpsState, isModified]);

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

  const isDenied = gpsState === 'denied';

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <span className="text-lg">{isDenied ? '⌨️' : '📍'}</span>
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder={isDenied ? 'Type your starting location…' : 'Your starting location…'}
          className={`w-full pl-12 pr-12 py-4 border rounded-2xl text-sm font-medium placeholder-ink-500 focus:outline-none focus:ring-2 transition-all ${
            isDenied && !isModified
              ? 'border-amber-500/60 focus:border-amber-500 focus:ring-amber-500/20'
              : 'border-ink-700 focus:border-amber-500 focus:ring-amber-500/20'
          }`}
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

      {/* Inline message when GPS is denied */}
      {isDenied && !isModified && (
        <p className="text-xs text-amber-500/80 px-1">
          Location access denied — type your starting suburb or address above.
        </p>
      )}
    </div>
  );
}
