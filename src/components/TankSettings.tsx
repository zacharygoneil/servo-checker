import { useState, useEffect, useCallback } from 'react';

const FUEL_TYPES = ['U91', 'E10', 'P95', 'P98', 'DSL', 'LPG'];

export interface Settings {
  tankCapacityL: number;
  currentFuelPct: number;
  efficiencyLper100km: number;
  fuelType: string;
}

interface Props {
  value: Settings;
  onChange: (s: Settings) => void;
}

const STORAGE_KEY = 'tank_settings';

// Migrate old fuel type codes (pre-API) to the Fair Fuel Open Data API codes.
const FUEL_CODE_MIGRATION: Record<string, string> = {
  'U95': 'P95',
  'U98': 'P98',
  'Diesel': 'DSL',
};

export function loadTankSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      const rawFuelType = parsed.fuelType ?? 'U91';
      return {
        tankCapacityL: parsed.tankCapacityL ?? 70,
        currentFuelPct: parsed.currentFuelPct ?? 50,
        efficiencyLper100km: parsed.efficiencyLper100km ?? 10.0,
        fuelType: FUEL_CODE_MIGRATION[rawFuelType] ?? rawFuelType,
      };
    }
  } catch {
    // ignore
  }
  return { tankCapacityL: 70, currentFuelPct: 50, efficiencyLper100km: 10.0, fuelType: 'U91' };
}


function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
  minLabel,
  maxLabel,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  minLabel: string;
  maxLabel: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-3">
        <label className="text-xs font-semibold text-ink-500 uppercase tracking-widest">
          {label}
        </label>
        <span className="text-sm font-bold text-ink-50 tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-ink-500 mt-1.5">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

export function TankSettings({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const update = useCallback(
    (patch: Partial<Settings>) => {
      const next = { ...value, ...patch };
      onChange(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [value, onChange]
  );

  useEffect(() => {
    if (value.currentFuelPct > 100) update({ currentFuelPct: 100 });
  }, [value.currentFuelPct, update]);

  const currentFuelL = Math.round((value.currentFuelPct / 100) * value.tankCapacityL);

  return (
    <div className="bg-ink-800 rounded-2xl border border-ink-700 overflow-hidden">
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🚗</span>
          <div>
            <p className="text-sm font-semibold text-ink-50">Vehicle settings</p>
            <p className="text-xs text-ink-400 mt-0.5">
              {value.fuelType} · {value.tankCapacityL}L · {currentFuelL}L on board
            </p>
          </div>
        </div>
        <span className="text-ink-600 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-ink-700">

          {/* ── Fuel type pill tray ── */}
          <div className="px-4 pt-4 pb-5">
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-widest mb-2.5">
              Fuel type
            </p>
            <div className="bg-ink-750 rounded-2xl p-1.5 flex flex-wrap gap-1">
              {FUEL_TYPES.map((type) => {
                const active = value.fuelType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => update({ fuelType: type })}
                    className={`flex-1 min-w-[4rem] px-3 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${
                      active
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-ink-500 hover:text-ink-200'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Sliders ── */}
          <div className="px-4 pb-5 space-y-5">
            <SliderRow
              label="Tank size"
              value={value.tankCapacityL}
              display={`${value.tankCapacityL} L`}
              min={30} max={120} step={5}
              onChange={(v) => update({ tankCapacityL: v })}
              minLabel="30L" maxLabel="120L"
            />

            <SliderRow
              label="Current fuel"
              value={value.currentFuelPct}
              display={`${currentFuelL} L (${value.currentFuelPct}%)`}
              min={0} max={100} step={5}
              onChange={(v) => update({ currentFuelPct: v })}
              minLabel="Empty" maxLabel="Full"
            />

            <SliderRow
              label="Fuel economy"
              value={value.efficiencyLper100km}
              display={`${value.efficiencyLper100km} L/100km`}
              min={5} max={25} step={0.5}
              onChange={(v) => update({ efficiencyLper100km: v })}
              minLabel="5 L/100" maxLabel="25 L/100"
            />
          </div>

        </div>
      )}
    </div>
  );
}
