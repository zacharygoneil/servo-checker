interface Props {
  onStart: () => void;
}

export function LandingScreen({ onStart }: Props) {
  return (
    <div className="h-full flex flex-col bg-ink-950">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 border-b border-ink-800" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <path d="M11 2C11 2 17 9.5 17 13.5C17 16.8 14.3 19.5 11 19.5C7.7 19.5 5 16.8 5 13.5C5 9.5 11 2 11 2Z" fill="white" />
            </svg>
          </div>
          <span className="font-mono font-bold text-ink-50 text-sm">servo checker</span>
        </div>
        <span className="font-mono text-xs text-ink-600 border border-ink-700 px-3 py-1 rounded-full">Victoria only</span>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-7">
        <p className="font-mono text-xs text-amber-500 tracking-widest uppercase">
          Live fuel prices · 1,500+ stations
        </p>

        <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight text-ink-50" style={{ letterSpacing: '-0.03em' }}>
          Stop paying <span className="text-amber-500">more</span><br />than you have to.
        </h1>

        <p className="text-base text-ink-400 max-w-xs leading-relaxed">
          Find the cheapest servo on your route — before you leave. Live prices, real savings.
        </p>

        <button
          type="button"
          onClick={onStart}
          className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-black text-base px-8 py-4 rounded-2xl transition-colors shadow-sm"
        >
          Check prices now &nbsp;→
        </button>

        {/* Stats */}
        <div className="flex gap-8 pt-4 border-t border-ink-800 w-full max-w-xs justify-center">
          {[
            { value: '1,500+', label: 'stations' },
            { value: 'Live', label: 'prices' },
            { value: 'Free', label: 'no account' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="font-mono font-bold text-lg text-ink-50">{value}</div>
              <div className="text-xs text-ink-600 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-ink-800 text-center" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <p className="font-mono text-xs text-ink-700">servochecker.live · Built in Victoria</p>
      </div>
    </div>
  );
}
