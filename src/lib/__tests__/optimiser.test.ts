import { describe, it, expect } from 'vitest';
import {
  runOptimiser,
  getPrice,
  medianBaselinePrice,
  calculateNetSaving,
  MAX_DETOUR_RADIUS_KM,
  MARGINAL_SAVING_THRESHOLD_DOLLARS,
} from '../optimiser';
import type { FuelStation, OptimiserInput } from '../../types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeStation(
  overrides: Partial<FuelStation> & { price?: number; fuelType?: string }
): FuelStation {
  const { price = 200, fuelType = 'U91', ...rest } = overrides;
  return {
    site_id: 'test-1',
    name: 'Test Station',
    brand: 'TestBrand',
    address: '1 Test St',
    suburb: 'Testville',
    postcode: '3000',
    latitude: -37.814,
    longitude: 144.963,
    fuel_types: [
      { fuel_type: fuelType, price, last_updated: '2026-03-23T10:00:00Z' },
    ],
    ...rest,
  };
}

// A simple straight route: CBD (south) → roughly 50 km north
// Each step is ~0.25° latitude (~28 km)
const ROUTE = [
  { lat: -37.814, lng: 144.963 }, // CBD (origin)
  { lat: -37.59, lng: 144.963 }, // ~25 km north
  { lat: -37.36, lng: 144.963 }, // ~50 km north (destination)
];

// A station sitting directly on the route (mid-point)
const ON_ROUTE_STATION = makeStation({
  site_id: 'on-route',
  name: 'On-Route Servo',
  latitude: -37.59,
  longitude: 144.963,
  price: 175, // cheap
});

// A station ~16 km off the route — beyond MAX_DETOUR_RADIUS_KM (15 km)
const OFF_ROUTE_STATION = makeStation({
  site_id: 'off-route',
  name: 'Far Servo',
  latitude: -37.59,
  longitude: 145.144, // ~16 km east of route at this latitude — outside 15 km radius
  price: 160, // very cheap but out of radius
});

// A pricier station on the route
const EXPENSIVE_STATION = makeStation({
  site_id: 'expensive',
  name: 'Expensive Servo',
  latitude: -37.5,
  longitude: 144.963,
  price: 220,
});

const BASE_INPUT: OptimiserInput = {
  routePolyline: ROUTE,
  routeDistanceKm: 50,
  stations: [ON_ROUTE_STATION, OFF_ROUTE_STATION, EXPENSIVE_STATION],
  fuelType: 'U91',
  tankCapacityL: 60,
  currentFuelL: 20, // ~200 km range at 10 L/100km — enough to complete 50 km trip but needs refill
  vehicleEfficiencyLper100km: 10,
  currentFuelPriceEstimate: 200, // 200 c/L baseline
};

// ---------------------------------------------------------------------------
// getPrice
// ---------------------------------------------------------------------------

describe('getPrice', () => {
  it('returns the price for an existing fuel type', () => {
    const station = makeStation({ price: 185, fuelType: 'U91' });
    expect(getPrice(station, 'U91')).toBe(185);
  });

  it('returns null when the fuel type is not stocked', () => {
    const station = makeStation({ fuelType: 'U91' });
    expect(getPrice(station, 'Diesel')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// medianBaselinePrice
// ---------------------------------------------------------------------------

describe('medianBaselinePrice', () => {
  it('returns null for an empty station list', () => {
    expect(medianBaselinePrice([], 'U91')).toBeNull();
  });

  it('returns null when no station carries the fuel type', () => {
    const stations = [makeStation({ fuelType: 'Diesel' })];
    expect(medianBaselinePrice(stations, 'U91')).toBeNull();
  });

  it('returns the single price for one station', () => {
    const stations = [makeStation({ price: 190 })];
    expect(medianBaselinePrice(stations, 'U91')).toBe(190);
  });

  it('returns the median for an odd-length list', () => {
    const stations = [
      makeStation({ site_id: '1', price: 180 }),
      makeStation({ site_id: '2', price: 200 }),
      makeStation({ site_id: '3', price: 220 }),
    ];
    expect(medianBaselinePrice(stations, 'U91')).toBe(200);
  });

  it('returns the average of the two middle values for an even-length list', () => {
    const stations = [
      makeStation({ site_id: '1', price: 180 }),
      makeStation({ site_id: '2', price: 200 }),
      makeStation({ site_id: '3', price: 210 }),
      makeStation({ site_id: '4', price: 230 }),
    ];
    expect(medianBaselinePrice(stations, 'U91')).toBe(205);
  });
});

// ---------------------------------------------------------------------------
// calculateNetSaving
// ---------------------------------------------------------------------------

describe('calculateNetSaving', () => {
  const baseParams = {
    stationPriceCentsPerL: 180,
    baselinePriceCentsPerL: 200,
    litresNeeded: 40,
    detourDistanceKm: 0,
    efficiency: 10,
  };

  it('returns positive saving when station is cheaper and no detour', () => {
    // (200-180) * 40 / 100 = $8
    expect(calculateNetSaving(baseParams)).toBeCloseTo(8.0, 2);
  });

  it('returns zero saving when station price equals baseline', () => {
    const result = calculateNetSaving({
      ...baseParams,
      stationPriceCentsPerL: 200,
    });
    expect(result).toBeCloseTo(0, 5);
  });

  it('returns negative saving when station is more expensive than baseline', () => {
    const result = calculateNetSaving({
      ...baseParams,
      stationPriceCentsPerL: 220,
    });
    expect(result).toBeLessThan(0);
  });

  it('deducts detour cost from the saving', () => {
    // 1 km detour, 10 L/100km → 0.1 L of fuel × 180 c/L = 18 c = $0.18 detour cost
    // gross saving = $8.00
    // net = 8.00 - 0.18 = $7.82
    const result = calculateNetSaving({ ...baseParams, detourDistanceKm: 1 });
    expect(result).toBeCloseTo(7.82, 1);
  });

  it('a large enough detour can eliminate a cheap station saving', () => {
    // 10 km detour at 10 L/100km = 1 L × 180 c = 180 c = $1.80 detour cost
    // gross saving = $8.00, net = $6.20 — still positive
    // 50 km detour = 5 L × 180 c = 900 c = $9.00 → net = -$1.00
    const result = calculateNetSaving({ ...baseParams, detourDistanceKm: 50 });
    expect(result).toBeLessThan(0);
  });

  it('saving scales with litresNeeded', () => {
    const double = calculateNetSaving({ ...baseParams, litresNeeded: 80 });
    const single = calculateNetSaving(baseParams);
    // Gross saving doubles; detour cost (0) unchanged → roughly doubles
    expect(double).toBeCloseTo(single * 2, 1);
  });
});

// ---------------------------------------------------------------------------
// runOptimiser
// ---------------------------------------------------------------------------

describe('runOptimiser', () => {
  it('returns correct tripStats', () => {
    const result = runOptimiser(BASE_INPUT);
    expect(result.tripStats.distanceKm).toBe(50);
    // 50 km at 10 L/100km = 5 L
    expect(result.tripStats.fuelNeededL).toBeCloseTo(5, 5);
    // 20 L on board — easily enough
    expect(result.tripStats.canCompleteWithoutStop).toBe(true);
  });

  it('excludes stations beyond MAX_DETOUR_RADIUS_KM', () => {
    const result = runOptimiser(BASE_INPUT);
    const ids = result.topStations.map((s) => s.site_id);
    expect(ids).not.toContain('off-route');
  });

  it('excludes stations more expensive than baseline from positive recommendations', () => {
    const result = runOptimiser(BASE_INPUT);
    const expensive = result.topStations.find((s) => s.site_id === 'expensive');
    // Either not present, or flagged as marginal/negative
    if (expensive) {
      expect(expensive.netSavingDollars).toBeLessThanOrEqual(0);
    }
  });

  it('recommends the cheapest on-route station', () => {
    const result = runOptimiser({
      ...BASE_INPUT,
      stations: [ON_ROUTE_STATION, EXPENSIVE_STATION],
    });
    expect(result.topStations[0]?.site_id).toBe('on-route');
  });

  it('returns no_data recommendation when no stations carry the fuel type', () => {
    const result = runOptimiser({
      ...BASE_INPUT,
      fuelType: 'LPG',
      currentFuelPriceEstimate: 120,
    });
    expect(result.recommendation).toBe('no_data');
    expect(result.topStations).toHaveLength(0);
  });

  it('returns skip when best saving is below the marginal threshold', () => {
    // Station is only 1 c/L cheaper than baseline → saving will be < $2
    const almostSamePrice = makeStation({
      site_id: 'marginal',
      latitude: -37.59,
      longitude: 144.963,
      price: 199, // only 1 c/L below 200 baseline
    });
    const result = runOptimiser({
      ...BASE_INPUT,
      stations: [almostSamePrice],
    });
    expect(result.recommendation).toBe('skip');
    expect(result.topStations[0]?.isMarginal).toBe(true);
  });

  it('recommends stop when there is a meaningful saving', () => {
    // 25 c/L saving on 40 L fill-up = $10 gross, minimal detour
    const cheapStation = makeStation({
      site_id: 'cheap',
      latitude: -37.59,
      longitude: 144.963, // on the route
      price: 175, // 25 c/L below 200 baseline
    });
    const result = runOptimiser({
      ...BASE_INPUT,
      currentFuelL: 20, // needs 40 L to fill 60 L tank
      stations: [cheapStation],
    });
    expect(result.recommendation).toBe('stop');
    expect(result.topStations[0]?.isMarginal).toBe(false);
    expect(result.topStations[0]?.netSavingDollars).toBeGreaterThan(
      MARGINAL_SAVING_THRESHOLD_DOLLARS
    );
  });

  it('needsToStop is false when user has enough fuel', () => {
    const result = runOptimiser({
      ...BASE_INPUT,
      currentFuelL: 60, // full tank — 600 km range
    });
    expect(result.needsToStop).toBe(false);
    expect(result.tripStats.canCompleteWithoutStop).toBe(true);
  });

  it('needsToStop is true when fuel is insufficient for the trip', () => {
    // 3 L on board, 50 km trip at 10 L/100km needs 5 L → can't make it
    const result = runOptimiser({
      ...BASE_INPUT,
      currentFuelL: 3,
    });
    expect(result.needsToStop).toBe(true);
    expect(result.tripStats.canCompleteWithoutStop).toBe(false);
  });

  it('returns at most TOP_N stations', () => {
    const manyStations = Array.from({ length: 10 }, (_, i) =>
      makeStation({
        site_id: `s${i}`,
        latitude: -37.59,
        longitude: 144.963,
        price: 175 + i, // slightly different prices
      })
    );
    const result = runOptimiser({ ...BASE_INPUT, stations: manyStations });
    expect(result.topStations.length).toBeLessThanOrEqual(10);
  });

  it('top stations are sorted by net saving descending', () => {
    const stations = [
      makeStation({ site_id: 'a', latitude: -37.59, longitude: 144.963, price: 195 }),
      makeStation({ site_id: 'b', latitude: -37.5, longitude: 144.963, price: 180 }),
      makeStation({ site_id: 'c', latitude: -37.6, longitude: 144.963, price: 170 }),
    ];
    const result = runOptimiser({ ...BASE_INPUT, stations });
    const savings = result.topStations.map((s) => s.netSavingDollars);
    for (let i = 0; i < savings.length - 1; i++) {
      expect(savings[i]).toBeGreaterThanOrEqual(savings[i + 1]);
    }
  });

  it('isMarginal flag uses the MARGINAL_SAVING_THRESHOLD_DOLLARS constant', () => {
    // Station that should net exactly at the boundary
    // litresNeeded = 60 - 20 = 40 L
    // To get exactly $2 saving: differential = 200/40 = 5 c/L → price = 195
    // (no detour since it's on the route)
    const boundaryStation = makeStation({
      site_id: 'boundary',
      latitude: -37.59,
      longitude: 144.963,
      price: 195,
    });
    const result = runOptimiser({
      ...BASE_INPUT,
      stations: [boundaryStation],
    });
    const s = result.topStations[0];
    expect(s).toBeDefined();
    // $2 saving is exactly at the threshold — isMarginal should be false (saving === threshold is NOT marginal)
    // calculateNetSaving: (200-195)*40/100 = $2.00
    // Our check is: netSavingDollars < MARGINAL_SAVING_THRESHOLD_DOLLARS
    // $2.00 < $2.00 is false → NOT marginal
    expect(s!.isMarginal).toBe(false);
  });

  it('uses median baseline price when currentFuelPriceEstimate is not provided', () => {
    const stations = [
      makeStation({ site_id: 'cheap', latitude: -37.59, longitude: 144.963, price: 160 }),
      makeStation({ site_id: 'mid', latitude: -37.5, longitude: 144.963, price: 200 }),
      makeStation({ site_id: 'exp', latitude: -37.4, longitude: 144.963, price: 240 }),
    ];
    // median = 200 c/L
    const result = runOptimiser({
      ...BASE_INPUT,
      currentFuelPriceEstimate: undefined,
      stations,
    });
    // cheap station: (200-160)*40/100 = $16 saving
    const cheap = result.topStations.find((s) => s.site_id === 'cheap');
    expect(cheap).toBeDefined();
    expect(cheap!.netSavingDollars).toBeCloseTo(16, 0);
  });
});

// ---------------------------------------------------------------------------
// On-route vs off-route split & "detour worth the saving" logic
//
// OFF_ROUTE_NEAR sits ~2.7 km east of the route — within MAX_DETOUR_RADIUS_KM
// (15 km) but beyond ON_ROUTE_THRESHOLD_KM (0.5 km round-trip).
//
// Detour distance = estimateDetourKm(2.7) = 2 × 2.7 × 1.3 = 7.02 km
// ---------------------------------------------------------------------------

const OFF_ROUTE_NEAR = makeStation({
  site_id: 'off-route-near',
  name: 'Nearby Off-Route Servo',
  latitude: -37.59,
  longitude: 144.993, // ~2.7 km east — within 15 km, but off-route
  price: 160,         // 15 c/L cheaper than ON_ROUTE_STATION (175 c/L)
});

const OFF_ROUTE_BARELY_CHEAPER = makeStation({
  site_id: 'off-route-marginal',
  name: 'Barely Cheaper Off-Route Servo',
  latitude: -37.59,
  longitude: 144.993, // same ~2.7 km east
  price: 174,         // only 1 c/L cheaper than ON_ROUTE_STATION (175 c/L)
});

describe('on-route vs off-route split', () => {
  it('places a station on the polyline in onRouteStations', () => {
    const result = runOptimiser({ ...BASE_INPUT, stations: [ON_ROUTE_STATION] });
    expect(result.onRouteStations.map((s) => s.site_id)).toContain('on-route');
    expect(result.offRouteStations.map((s) => s.site_id)).not.toContain('on-route');
  });

  it('places a 2.7 km off-route station in offRouteStations', () => {
    const result = runOptimiser({
      ...BASE_INPUT,
      stations: [ON_ROUTE_STATION, OFF_ROUTE_NEAR],
    });
    expect(result.offRouteStations.map((s) => s.site_id)).toContain('off-route-near');
    expect(result.onRouteStations.map((s) => s.site_id)).not.toContain('off-route-near');
  });

  it('cheapestOnRoutePriceCents reflects the cheapest on-route station', () => {
    const result = runOptimiser({
      ...BASE_INPUT,
      stations: [ON_ROUTE_STATION, EXPENSIVE_STATION],
    });
    // ON_ROUTE_STATION = 175 c/L, EXPENSIVE_STATION = 220 c/L
    expect(result.cheapestOnRoutePriceCents).toBe(175);
  });

  // ── "Detour IS worth the saving" ──────────────────────────────────────────
  //
  // Setup: ON_ROUTE_STATION @ 175 c/L (baseline for off-route comparison)
  //        OFF_ROUTE_NEAR   @ 160 c/L, ~2.7 km east → detour ≈ 7.02 km
  //
  // Gross saving:  (175 - 160) × 40 L / 100      = $6.00
  // Detour cost:   (7.02 × 10 / 100) L × 160 c/L = $1.12
  // Net saving:    $6.00 − $1.12                  ≈ $4.88  → worth the detour
  it('off-route station with meaningful price gap has positive net saving above threshold', () => {
    const result = runOptimiser({
      ...BASE_INPUT,
      stations: [ON_ROUTE_STATION, OFF_ROUTE_NEAR],
    });
    const offStation = result.offRouteStations.find((s) => s.site_id === 'off-route-near');
    expect(offStation).toBeDefined();
    expect(offStation!.netSavingDollars).toBeGreaterThan(2); // above MARGINAL_SAVING_THRESHOLD_DOLLARS
    expect(offStation!.isMarginal).toBe(false);
  });

  // ── "Detour is NOT worth the saving" ─────────────────────────────────────
  //
  // Setup: ON_ROUTE_STATION              @ 175 c/L (baseline)
  //        OFF_ROUTE_BARELY_CHEAPER      @ 174 c/L, same ~7.02 km detour
  //
  // Gross saving:  (175 - 174) × 40 L / 100      = $0.40
  // Detour cost:   (7.02 × 10 / 100) L × 174 c/L = $1.22
  // Net saving:    $0.40 − $1.22                  ≈ −$0.82  → not worth it
  it('off-route station with tiny price gap has negative net saving', () => {
    const result = runOptimiser({
      ...BASE_INPUT,
      stations: [ON_ROUTE_STATION, OFF_ROUTE_BARELY_CHEAPER],
    });
    const offStation = result.offRouteStations.find(
      (s) => s.site_id === 'off-route-marginal'
    );
    expect(offStation).toBeDefined();
    expect(offStation!.netSavingDollars).toBeLessThan(0);
  });

  it('off-route saving is compared against cheapest on-route, not median', () => {
    // Two on-route stations: 175 c/L and 190 c/L.  Median = 182.5 c/L.
    // Off-route station: 180 c/L — only 5 c cheaper than median, but 5 c MORE than cheapest on-route.
    // → Net saving vs cheapest on-route should be negative (detour not worth it).
    const onRoute2 = makeStation({
      site_id: 'on-route-2',
      latitude: -37.5,
      longitude: 144.963,
      price: 190,
    });
    const offRoute180 = makeStation({
      site_id: 'off-route-180',
      latitude: -37.59,
      longitude: 144.993, // ~2.7 km east
      price: 180, // 5 c/L MORE expensive than cheapest on-route (175)
    });
    const result = runOptimiser({
      ...BASE_INPUT,
      currentFuelPriceEstimate: undefined, // force median baseline
      stations: [ON_ROUTE_STATION, onRoute2, offRoute180],
    });
    const offStation = result.offRouteStations.find((s) => s.site_id === 'off-route-180');
    expect(offStation).toBeDefined();
    // 180 > 175 (cheapest on-route) → saving is negative even before detour cost
    expect(offStation!.netSavingDollars).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// Constants exported for UI use
// ---------------------------------------------------------------------------

describe('exported constants', () => {
  it('MAX_DETOUR_RADIUS_KM matches the spec value', () => {
    expect(MAX_DETOUR_RADIUS_KM).toBe(15);
  });

  it('MARGINAL_SAVING_THRESHOLD_DOLLARS matches the spec value', () => {
    expect(MARGINAL_SAVING_THRESHOLD_DOLLARS).toBe(2.0);
  });
});
