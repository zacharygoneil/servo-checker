import { useState, useCallback } from 'react';
import { useGeolocation } from './hooks/useGeolocation';
import { useStations } from './hooks/useStations';
import { useLocationName } from './hooks/useLocationName';
import { LocationInput } from './components/LocationInput';
import { TankSettings, loadTankSettings } from './components/TankSettings';
import type { Settings as TankSettingsValue } from './components/TankSettings';
import { RouteMap } from './components/RouteMap';
import { ResultsPanel } from './components/ResultsPanel';
import { getRoute } from './lib/googleMaps';
import { runOptimiser } from './lib/optimiser';
import type { OptimiserResult, LatLng } from './types';
import type { RouteResult } from './lib/googleMaps';

type Screen = 'setup' | 'loading' | 'results';

// -------------------------------------------------------------------------
// Wordmark
// -------------------------------------------------------------------------
function WordMark() {
  return (
    <div className="flex items-center gap-3">
      {/* App icon — amber badge with fuel drop */}
      <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center shadow-sm shrink-0">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M11 2C11 2 17 9.5 17 13.5C17 16.8 14.3 19.5 11 19.5C7.7 19.5 5 16.8 5 13.5C5 9.5 11 2 11 2Z"
            fill="white"
          />
        </svg>
      </div>
      <div>
        <h1 className="text-2xl font-black text-ink-50 leading-none tracking-tight">servo checker</h1>
        <p className="text-xs text-ink-400 mt-0.5 font-medium">find the cheapest servo on your route.</p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Loading screen
// -------------------------------------------------------------------------
function LoadingScreen() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 bg-ink-950">
      <div className="w-16 h-16 rounded-3xl bg-amber-500 flex items-center justify-center shadow-lg">
        <svg width="30" height="30" viewBox="0 0 22 22" fill="none">
          <path
            d="M11 2C11 2 17 9.5 17 13.5C17 16.8 14.3 19.5 11 19.5C7.7 19.5 5 16.8 5 13.5C5 9.5 11 2 11 2Z"
            fill="white"
            className="animate-pulse"
          />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-ink-50">Finding your best stop…</p>
        <p className="text-sm text-ink-400 mt-1">Checking {Intl.NumberFormat().format(1500)}+ Victorian servos</p>
      </div>
      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-amber-400"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const geo = useGeolocation();
  const { stations } = useStations();
  const locationName = useLocationName(geo.location);

  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationPlaceId, setDestinationPlaceId] = useState('');
  const [tankSettings, setTankSettings] = useState<TankSettingsValue>(loadTankSettings);

  const [screen, setScreen] = useState<Screen>('setup');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimiserResult | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [destinationLatLng, setDestinationLatLng] = useState<LatLng | null>(null);

  const handlePlaceSelect = useCallback((address: string, placeId: string) => {
    setDestinationAddress(address);
    setDestinationPlaceId(placeId);
  }, []);

  const handleSearch = async () => {
    if (!geo.location || !destinationPlaceId) return;
    setScreen('loading');
    setError(null);

    try {
      const route = await getRoute(geo.location, destinationPlaceId);
      const currentFuelL = (tankSettings.currentFuelPct / 100) * tankSettings.tankCapacityL;

const optimiserResult = runOptimiser({
        routePolyline: route.polyline,
        routeDistanceKm: route.distanceKm,
        stations,
        fuelType: tankSettings.fuelType,
        tankCapacityL: tankSettings.tankCapacityL,
        currentFuelL,
        vehicleEfficiencyLper100km: tankSettings.efficiencyLper100km,
      });

      setRouteResult(route);
      setResult(optimiserResult);
      setDestinationLatLng(route.polyline[route.polyline.length - 1] ?? null);
      setScreen('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setScreen('setup');
    }
  };

  const canSearch = !!geo.location && !!destinationPlaceId && stations.length > 0;

  if (screen === 'loading') return <LoadingScreen />;

  if (screen === 'results' && result && routeResult) {
    return (
      <div className="h-full flex flex-col">
        <div className="shrink-0" style={{ height: '45vh' }}>
          <RouteMap
            polyline={routeResult.polyline}
            topStations={result.topStations}
            destination={destinationLatLng}
          />
        </div>
        <div className="flex-1 overflow-hidden bg-ink-950">
          <ResultsPanel
            result={result}
            origin={geo.location!}
            destinationAddress={destinationAddress}
            onBack={() => setScreen('setup')}
          />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Setup screen
  // -------------------------------------------------------------------------
  return (
    <div className="h-full flex flex-col bg-ink-950">
      {/* Header — top safe area */}
      <div className="px-5 pb-5 bg-ink-900 border-b border-ink-700" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <WordMark />
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">

        {/* GPS status */}
        <div className="flex items-center gap-3 px-4 py-3.5 bg-ink-800 rounded-2xl border border-ink-700">
          <span className="text-xl shrink-0">
            {geo.loading ? '⏳' : geo.error ? '❌' : '📍'}
          </span>
          <div className="min-w-0">
            {geo.loading && (
              <p className="text-sm font-semibold text-ink-500">Getting your location…</p>
            )}
            {geo.error === 'denied' && (
              <>
                <p className="text-sm font-bold text-red-600">Location access denied</p>
                <p className="text-xs text-red-400 mt-0.5">Enable location in your browser settings.</p>
              </>
            )}
            {geo.error === 'unavailable' && (
              <p className="text-sm font-bold text-red-600">Location unavailable</p>
            )}
            {geo.location && !geo.error && (
              <p className="text-sm font-bold text-ink-50">
                {locationName ?? `${geo.location.lat.toFixed(3)}, ${geo.location.lng.toFixed(3)}`}
              </p>
            )}
          </div>
        </div>

        {/* Destination */}
        <LocationInput onSelect={handlePlaceSelect} />

        {/* Vehicle settings */}
        <TankSettings value={tankSettings} onChange={setTankSettings} />

        {/* How it works */}
        <div className="px-1 pt-2 pb-1">
          <p className="text-xs font-bold text-ink-600 uppercase tracking-widest mb-4 px-1">How it works</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { emoji: '🗺️', title: 'Enter destination', desc: 'Any address or place in Victoria' },
              { emoji: '⛽', title: '1,500+ servos checked', desc: 'All Victorian stations, live prices' },
              { emoji: '💰', title: 'Best stop found', desc: 'Cheapest on your route, worth any detour' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="bg-ink-800 rounded-2xl p-3 flex flex-col gap-2 border border-ink-700">
                <span className="text-2xl">{emoji}</span>
                <p className="text-xs font-bold text-ink-100 leading-tight">{title}</p>
                <p className="text-xs text-ink-500 leading-tight">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-950/60 border border-red-900/50 rounded-2xl flex gap-2 items-start">
            <span className="shrink-0">❌</span>
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

      </div>

      {/* CTA — bottom safe area */}
      <div className="px-5 pt-3 bg-ink-950 border-t border-ink-800" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
        <button
          type="button"
          onClick={handleSearch}
          disabled={!canSearch}
          className="w-full py-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-ink-800 disabled:text-ink-600 text-white font-black text-base rounded-2xl transition-colors shadow-sm"
        >
          {!geo.location
            ? 'Waiting for location…'
            : !destinationPlaceId
              ? 'Enter a destination'
              : stations.length === 0
                ? 'Loading stations…'
                : 'Find cheapest stop →'}
        </button>
      </div>
    </div>
  );
}
