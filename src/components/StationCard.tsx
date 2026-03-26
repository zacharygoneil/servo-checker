import type { RankedStation } from '../types';

interface Props {
  station: RankedStation;
  rank: number;
  onNavigate: () => void;
  isHero?: boolean;
  isOffRoute?: boolean;
  /** e.g. "198.9¢ avg" or "192.1¢ cheapest on route" */
  baselineLabel?: string;
}

// -------------------------------------------------------------------------
// Hero card — dark surface, big KPI numbers
// -------------------------------------------------------------------------
function HeroCard({ station, onNavigate, baselineLabel }: {
  station: RankedStation;
  onNavigate: () => void;
  baselineLabel?: string;
}) {
  const detourText =
    station.detourDistanceKm < 0.1
      ? 'On route'
      : `${station.detourDistanceKm.toFixed(1)} km detour`;

  const saving = station.netSavingDollars;
  const savingColor = saving >= 2 ? 'text-amber-400' : saving > 0 ? 'text-amber-300' : 'text-red-400';

  return (
    <div className="bg-ink-800 rounded-3xl overflow-hidden border border-ink-700">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">
          Best stop
        </span>
        <span className="text-xs font-semibold text-ink-400 bg-ink-750 px-2.5 py-1 rounded-full">
          #1
        </span>
      </div>

      {/* Station name */}
      <div className="px-5 pb-4">
        <p className="text-ink-50 text-xl font-bold leading-tight">{station.name}</p>
        <p className="text-ink-400 text-sm mt-0.5 truncate">{station.address}</p>
      </div>

      {/* KPI row */}
      <div className="mx-5 mb-4 grid grid-cols-2 gap-3">
        {/* Price */}
        <div className="bg-ink-750 rounded-2xl px-4 py-3">
          <p className="text-ink-50 text-4xl font-black tabular-nums leading-none">
            {station.selectedFuelPrice.toFixed(1)}
          </p>
          <p className="text-ink-400 text-xs mt-1.5">cents per litre</p>
        </div>

        {/* Saving */}
        <div className="bg-ink-750 rounded-2xl px-4 py-3">
          <p className={`text-4xl font-black tabular-nums leading-none ${savingColor}`}>
            {saving >= 0 ? `$${saving.toFixed(2)}` : `−$${Math.abs(saving).toFixed(2)}`}
          </p>
          <p className="text-ink-400 text-xs mt-1.5 leading-tight">
            {saving >= 2
              ? <>you save<br /><span className="text-ink-500">{baselineLabel && `vs ${baselineLabel}`}</span></>
              : saving > 0
                ? <>marginal<br /><span className="text-ink-500">{baselineLabel && `vs ${baselineLabel}`}</span></>
                : 'costs more'}
          </p>
        </div>
      </div>

      {/* Detour */}
      <div className="px-5 pb-4 flex items-center gap-1.5">
        <span className="text-ink-500 text-sm">📍</span>
        <span className="text-ink-400 text-sm">{detourText}</span>
      </div>

      {/* Navigate CTA */}
      <div className="px-5 pb-5">
        <button
          type="button"
          onClick={onNavigate}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          Add stop in Google Maps →
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Secondary cards
// -------------------------------------------------------------------------
function SecondaryCard({ station, rank, onNavigate, isOffRoute, baselineLabel }: {
  station: RankedStation;
  rank: number;
  onNavigate: () => void;
  isOffRoute?: boolean;
  baselineLabel?: string;
}) {
  const detourText =
    station.detourDistanceKm < 0.1
      ? 'On route'
      : `${station.detourDistanceKm.toFixed(1)} km detour`;

  const saving = station.netSavingDollars;
  const savingColor =
    saving >= 2 ? 'text-emerald-400' : saving > 0 ? 'text-amber-400' : 'text-red-400';

  const savingText = saving >= 0
    ? `Save $${saving.toFixed(2)}${baselineLabel ? ` vs ${baselineLabel}` : ''}`
    : isOffRoute
      ? `+$${Math.abs(saving).toFixed(2)} vs on route`
      : `+$${Math.abs(saving).toFixed(2)} extra`;

  return (
    <div className="bg-ink-800 rounded-2xl border border-ink-700 px-4 py-3.5">
      {/* Row 1: rank + name + navigate */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-ink-750 flex items-center justify-center text-xs font-bold text-ink-400">
          {rank}
        </span>
        <p className="flex-1 font-bold text-ink-50 text-sm leading-snug">{station.name}</p>
        <button
          type="button"
          onClick={onNavigate}
          className="shrink-0 w-8 h-8 rounded-full bg-ink-750 hover:bg-amber-500/20 flex items-center justify-center text-ink-400 hover:text-amber-400 transition-colors text-sm"
          title="Navigate"
        >
          →
        </button>
      </div>
      {/* Row 2: detour + price + saving */}
      <div className="flex items-center justify-between mt-2 pl-10">
        <p className="text-ink-500 text-xs">{detourText}</p>
        <div className="text-right">
          <span className="text-xl font-black tabular-nums text-ink-50 leading-none">
            {station.selectedFuelPrice.toFixed(1)}<span className="text-xs font-semibold text-ink-400">¢</span>
          </span>
          <p className={`text-xs font-semibold mt-0.5 ${savingColor}`}>{savingText}</p>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Public export
// -------------------------------------------------------------------------
export function StationCard({ station, rank, onNavigate, isHero = false, isOffRoute = false, baselineLabel }: Props) {
  if (isHero) {
    return <HeroCard station={station} onNavigate={onNavigate} baselineLabel={baselineLabel} />;
  }
  return <SecondaryCard station={station} rank={rank} onNavigate={onNavigate} isOffRoute={isOffRoute} baselineLabel={baselineLabel} />;
}
