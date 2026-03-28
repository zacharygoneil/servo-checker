import type { OptimiserResult, LatLng } from '../types';
import { StationCard } from './StationCard';
import { DataFreshnessWarning } from './DataFreshnessWarning';
import { buildNavigationUrl } from '../lib/googleMaps';

interface Props {
  result: OptimiserResult;
  origin: LatLng;
  destinationAddress: string;
  onBack: () => void;
}

export function ResultsPanel({ result, origin, destinationAddress, onBack }: Props) {
  const {
    onRouteStations, offRouteStations, topStations,
    tripStats, recommendation,
    cheapestOnRoutePriceCents, medianPriceCents,
  } = result;

  function handleNavigate(station: { latitude: number; longitude: number }) {
    const url = buildNavigationUrl(origin, destinationAddress, station.latitude, station.longitude);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const lastUpdated =
    topStations[0]?.fuel_types.find((f) => f.last_updated)?.last_updated ??
    new Date().toISOString();

  // Baseline labels shown in saving cells
  const onRouteBaselineLabel = medianPriceCents
    ? `${medianPriceCents.toFixed(1)}¢ Vic avg`
    : undefined;
  const offRouteBaselineLabel = cheapestOnRoutePriceCents
    ? `${cheapestOnRoutePriceCents.toFixed(1)}¢ on route`
    : onRouteBaselineLabel;

  // Only promote off-route to hero if the net saving is genuinely meaningful (>= $2).
  // A marginal saving isn't worth a detour — keep on-route as hero in that case.
  const HERO_THRESHOLD = 2.0;
  const detourIsHero =
    offRouteStations.length > 0 &&
    offRouteStations[0].netSavingDollars >= HERO_THRESHOLD;

  return (
    <div className="bg-ink-950">
      {/* Nav row */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-ink-400 hover:text-ink-100 transition-colors flex items-center gap-1"
        >
          ← Back
        </button>
        <p className="text-xs text-ink-500 tabular-nums">
          {tripStats.distanceKm.toFixed(0)} km · {tripStats.fuelNeededL.toFixed(1)} L needed
        </p>
      </div>

      <div className="px-5 pb-10 space-y-3">

        {/* Tank fine banner */}
        {tripStats.canCompleteWithoutStop && recommendation !== 'no_data' && (
          <div className="bg-emerald-950/60 border border-emerald-900/50 rounded-2xl px-4 py-3 flex gap-3 items-center">
            <span className="text-xl shrink-0">✅</span>
            <div>
              <p className="text-sm font-bold text-emerald-300">Tank's good for this trip</p>
              <p className="text-xs text-emerald-600 mt-0.5">Cheapest options shown if you want to top up.</p>
            </div>
          </div>
        )}

        {/* Needs fuel banner */}
        {!tripStats.canCompleteWithoutStop && (
          <div className="bg-red-950/60 border border-red-900/50 rounded-2xl px-4 py-3 flex gap-3 items-center">
            <span className="text-xl shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-bold text-red-300">You'll need to stop</p>
              <p className="text-xs text-red-600 mt-0.5">Not enough fuel to complete this trip.</p>
            </div>
          </div>
        )}

        {/* No data */}
        {recommendation === 'no_data' && (
          <div className="bg-ink-800 border border-ink-700 rounded-2xl px-4 py-8 text-center">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm font-bold text-ink-100">No stations found near this route</p>
            <p className="text-xs text-ink-400 mt-1.5 leading-relaxed">
              Servo Checker covers Victorian routes only. If your route passes through Victoria, try a different fuel type.
            </p>
          </div>
        )}

        {/* ── DETOUR IS THE HERO ───────────────────────────────────────── */}
        {detourIsHero && (
          <>
            <StationCard
              station={offRouteStations[0]}
              rank={1}
              isHero
              isOffRoute
              baselineLabel={offRouteBaselineLabel}
              vicAvgLabel={onRouteBaselineLabel}
              onNavigate={() => handleNavigate(offRouteStations[0])}
            />

            {/* Remaining off-route options */}
            {offRouteStations.slice(1).map((station, i) => (
              <StationCard
                key={station.site_id}
                station={station}
                rank={i + 2}
                isOffRoute
                baselineLabel={offRouteBaselineLabel}
                onNavigate={() => handleNavigate(station)}
              />
            ))}

            {/* On-route stations shown as secondary */}
            {onRouteStations.length > 0 && (
              <>
                <p className="text-xs font-bold text-ink-500 uppercase tracking-widest pt-2 px-1">
                  On your route
                </p>
                {onRouteStations.map((station, i) => (
                  <StationCard
                    key={station.site_id}
                    station={station}
                    rank={i + 1}
                    baselineLabel={onRouteBaselineLabel}
                    onNavigate={() => handleNavigate(station)}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* ── ON-ROUTE IS THE HERO (no worthwhile detour) ──────────────── */}
        {!detourIsHero && onRouteStations.length > 0 && (
          <>
            <p className="text-xs font-bold text-ink-500 uppercase tracking-widest pt-1 px-1">
              On your route
            </p>
            <StationCard
              station={onRouteStations[0]}
              rank={1}
              isHero
              baselineLabel={onRouteBaselineLabel}
              onNavigate={() => handleNavigate(onRouteStations[0])}
            />
            {onRouteStations.slice(1).map((station, i) => (
              <StationCard
                key={station.site_id}
                station={station}
                rank={i + 2}
                baselineLabel={onRouteBaselineLabel}
                onNavigate={() => handleNavigate(station)}
              />
            ))}
          </>
        )}

        {/* ── OFF ROUTE (when not hero) ─────────────────────────────────── */}
        {!detourIsHero && offRouteStations.length > 0 && (
          <>
            <p className="text-xs font-bold text-ink-500 uppercase tracking-widest pt-2 px-1">
              Worth the detour?
            </p>
            {offRouteStations.map((station, i) => (
              <StationCard
                key={station.site_id}
                station={station}
                rank={i + 1}
                isOffRoute
                baselineLabel={offRouteBaselineLabel}
                onNavigate={() => handleNavigate(station)}
              />
            ))}
          </>
        )}

        {topStations.length > 0 && <DataFreshnessWarning lastUpdated={lastUpdated} />}

        <p className="text-center text-xs text-ink-600 pb-2">
          Fuel price data sourced from Service Victoria's Servo Saver.
          <br />Prices subject to 24-hour delay.
        </p>
      </div>
    </div>
  );
}
