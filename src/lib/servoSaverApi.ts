import type { FuelStation, CachedStations } from '../types';

const CACHE_KEY = 'servo_saver_stations';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Relative URL — Vite dev proxy in development, api/stations.ts on Vercel in production.
const API_BASE = '/api/stations';

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

function readCache(): FuelStation[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedStations = JSON.parse(raw);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.stations;
  } catch { /* corrupt entry — ignore */ }
  return null;
}

function writeCache(stations: FuelStation[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), stations } satisfies CachedStations));
  } catch { /* localStorage full or unavailable — non-fatal */ }
}

export function clearStationsCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

/**
 * Normalise the Servo Saver API v2 response into our FuelStation type.
 * Handles PascalCase (real API) and snake_case (defensive fallback).
 */
/**
 * Real API response shape (Fair Fuel Open Data API v1):
 * {
 *   fuelPriceDetails: [{
 *     fuelStation: { id, name, brandId, address, location: { latitude, longitude } },
 *     fuelPrices: [{ fuelType, price, isAvailable, updatedAt }],
 *     updatedAt
 *   }]
 * }
 */
function parseApiResponse(data: unknown): FuelStation[] {
  const d = data as Record<string, unknown>;
  const raw = Array.isArray(d.fuelPriceDetails) ? d.fuelPriceDetails : [];

  if (raw.length === 0) throw new Error('Unexpected API response shape — fuelPriceDetails missing or empty');

  return (raw as Record<string, unknown>[]).map((item) => {
    const station = item.fuelStation as Record<string, unknown>;
    const location = station?.location as Record<string, unknown> | undefined;
    // Normalise address: collapse double spaces, title-case all-caps words
    const rawAddress = String(station?.address ?? '');
    const address = rawAddress
      .replace(/\s{2,}/g, ' ')
      .replace(/\b([A-Z]{2,})\b/g, (w) => w.charAt(0) + w.slice(1).toLowerCase())
      .trim();
    // address format: "123 Main St, Suburb VIC 3000" — extract suburb/postcode if present
    const suburbMatch = address.match(/,\s*([^,]+?)\s+VIC\s+(\d{4})/);

    return {
      site_id: String(station?.id ?? ''),
      name: String(station?.name ?? ''),
      brand: String(station?.brandId ?? ''),
      address,
      suburb: suburbMatch?.[1] ?? '',
      postcode: suburbMatch?.[2] ?? '',
      latitude: Number(location?.latitude ?? 0),
      longitude: Number(location?.longitude ?? 0),
      fuel_types: parseFuelPrices(item.fuelPrices),
    };
  });
}

function parseFuelPrices(raw: unknown): FuelStation['fuel_types'] {
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[])
    .filter((item) => item.isAvailable !== false) // exclude unavailable fuel types
    .map((item) => ({
      fuel_type: String(item.fuelType ?? ''),
      price: Number(item.price ?? 0),
      last_updated: String(item.updatedAt ?? new Date().toISOString()),
    }));
}

// ---------------------------------------------------------------------------
// Prefetch — kick off the network request at module load time so it's already
// in flight before React mounts. getStations() just awaits this promise.
// ---------------------------------------------------------------------------

const _prefetch: Promise<FuelStation[]> = (() => {
  // Return cached data synchronously-wrapped if still fresh
  const cached = readCache();
  if (cached) return Promise.resolve(cached);

  // Otherwise start the fetch immediately
  return fetch(API_BASE, { headers: { Accept: 'application/json' } })
    .then((r) => {
      if (!r.ok) throw new Error(`Servo Saver API error: ${r.status}`);
      return r.json() as Promise<unknown>;
    })
    .then((data) => {
      const stations = parseApiResponse(data);
      writeCache(stations);
      return stations;
    });
})();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns all Victorian fuel stations. Resolves instantly from cache if
 * available; otherwise awaits the in-flight prefetch started at module load.
 */
export async function getStations(): Promise<FuelStation[]> {
  return _prefetch;
}
