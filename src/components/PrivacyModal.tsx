interface Props {
  onClose: () => void;
}

export function PrivacyModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg bg-ink-900 rounded-3xl border border-ink-700 p-6 space-y-4 overflow-y-auto"
        style={{ maxHeight: 'calc(100dvh - 3rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-50">Privacy policy</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-500 hover:text-ink-200 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-sm text-ink-400 leading-relaxed">
          <p>
            Servo Checker is a free tool to help Victorian drivers find the cheapest
            petrol on their route. We take your privacy seriously.
          </p>

          <div>
            <p className="font-semibold text-ink-200 mb-1">Location</p>
            <p>
              Your location is used only to find servos near your route. It is
              processed in your browser and never sent to our servers or stored anywhere.
            </p>
          </div>

          <div>
            <p className="font-semibold text-ink-200 mb-1">Data we don't collect</p>
            <p>
              We do not collect, store, or share any personal information. There are
              no accounts, no tracking, no analytics, and no cookies beyond what
              Google Maps requires to function.
            </p>
          </div>

          <div>
            <p className="font-semibold text-ink-200 mb-1">Fuel price data</p>
            <p>
              Live fuel prices are sourced from the{' '}
              <span className="text-ink-200">Service Victoria Fair Fuel Open Data</span>{' '}
              API, a Victorian Government initiative.
            </p>
          </div>

          <div>
            <p className="font-semibold text-ink-200 mb-1">Third-party services</p>
            <p>
              We use Google Maps for routing and location search. Google's own
              privacy policy applies to that data.
            </p>
          </div>

          <p className="text-ink-600 text-xs pt-2">
            Last updated March 2026 · Questions? Built by Zachary O'Neil
          </p>
        </div>
      </div>
    </div>
  );
}
