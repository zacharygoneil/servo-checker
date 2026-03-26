interface Props {
  value: string;
  onChange: (type: string) => void;
}

// Codes match the Fair Fuel Open Data API exactly (section 7.7.6)
const FUEL_TYPES = [
  { id: 'U91', label: 'U91' },
  { id: 'E10', label: 'E10' },
  { id: 'P95', label: 'P95' },
  { id: 'P98', label: 'P98' },
  { id: 'DSL', label: 'Diesel' },
  { id: 'LPG', label: 'LPG' },
];

export function FuelTypeSelector({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
        Fuel type
      </p>
      <div className="flex flex-wrap gap-2">
        {FUEL_TYPES.map((type) => {
          const active = value === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onChange(type.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 ${
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-500'
              }`}
            >
              ⛽ {type.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
