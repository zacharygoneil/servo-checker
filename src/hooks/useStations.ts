import { useState, useEffect } from 'react';
import type { FuelStation } from '../types';
import { getStations } from '../lib/servoSaverApi';

interface StationsState {
  stations: FuelStation[];
  loading: boolean;
  error: string | null;
}

/**
 * Pre-fetches the full station list on mount so it's ready by the time
 * the user hits "Find Stops". The 30-minute localStorage cache means
 * subsequent renders are instant.
 */
export function useStations(): StationsState {
  const [state, setState] = useState<StationsState>({
    stations: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    getStations()
      .then((stations) => {
        if (!cancelled) setState({ stations, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            stations: [],
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load stations',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
