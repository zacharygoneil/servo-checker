import type {
  FuelStation,
  OptimiserInput,
  OptimiserResult,
  RankedStation,
} from '../types';
import {
  distanceToPolylineKm,
  estimateDetourKm,
  fractionAlongRoute,
} from './polylineUtils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stations further than this from the route polyline are excluded. */
export const MAX_DETOUR_RADIUS_KM = 15;

/** Stations within this distance are considered "on route" — no meaningful detour. */
export const ON_ROUTE_THRESHOLD_KM = 0.5;

/** Net savings below this are flagged as marginal / not worth the stop. */
export const MARGINAL_SAVING_THRESHOLD_DOLLARS = 2.0;

/** Maximum candidates returned per category (on-route / off-route). */
const TOP_N = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return the price (cents/L) for `fuelType` at `station`, or null if
 * the station doesn't carry that fuel type.
 */
export function getPrice(
  station: FuelStation,
  fuelType: string
): number | null {
  const entry = station.fuel_types.find((f) => f.fuel_type === fuelType);
  return entry ? entry.price : null;
}

/**
 * Derive a baseline price for the selected fuel type from the dataset.
 * Uses the median price across all stations that carry the fuel type.
 */
export function medianBaselinePrice(
  stations: FuelStation[],
  fuelType: string
): number | null {
  const prices = stations
    .map((s) => getPrice(s, fuelType))
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b);

  if (prices.length === 0) return null;

  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 === 0
    ? (prices[mid - 1] + prices[mid]) / 2
    : prices[mid];
}

/**
 * Calculate net saving (in dollars) for refuelling at a given station
 * compared to the baseline price.
 *
 * Positive → user saves money by stopping here.
 * Negative → stopping here costs more.
 */
export function calculateNetSaving(params: {
  stationPriceCentsPerL: number;
  baselinePriceCentsPerL: number;
  litresNeeded: number;
  detourDistanceKm: number;
  efficiency: number;
}): number {
  const {
    stationPriceCentsPerL,
    baselinePriceCentsPerL,
    litresNeeded,
    detourDistanceKm,
    efficiency,
  } = params;

  // Saving on the purchase
  const priceDifferentialCents = baselinePriceCentsPerL - stationPriceCentsPerL;
  const fuelSavingCents = priceDifferentialCents * litresNeeded;

  // Extra fuel burned on the detour, priced at the station's rate
  const detourFuelL = (detourDistanceKm * efficiency) / 100;
  const detourCostCents = detourFuelL * stationPriceCentsPerL;

  return (fuelSavingCents - detourCostCents) / 100;
}

// ---------------------------------------------------------------------------
// Core optimiser
// ---------------------------------------------------------------------------

export function runOptimiser(input: OptimiserInput): OptimiserResult {
  const {
    routePolyline,
    routeDistanceKm,
    stations,
    fuelType,
    tankCapacityL,
    currentFuelL,
    vehicleEfficiencyLper100km: efficiency,
    currentFuelPriceEstimate,
  } = input;

  // -------------------------------------------------------------------------
  // Trip stats
  // -------------------------------------------------------------------------
  const fuelNeededL = (routeDistanceKm * efficiency) / 100;
  const canCompleteWithoutStop = currentFuelL >= fuelNeededL;

  const tripStats = {
    distanceKm: routeDistanceKm,
    fuelNeededL,
    canCompleteWithoutStop,
  };

  // -------------------------------------------------------------------------
  // Baseline price
  // -------------------------------------------------------------------------
  const baselinePrice =
    currentFuelPriceEstimate ?? medianBaselinePrice(stations, fuelType);

  if (baselinePrice === null) {
    return {
      needsToStop: !canCompleteWithoutStop,
      recommendation: 'no_data',
      onRouteStations: [],
      offRouteStations: [],
      topStations: [],
      cheapestOnRoutePriceCents: null,
      medianPriceCents: null,
      tripStats,
    };
  }

  // -------------------------------------------------------------------------
  // Step 1: Filter to stations that carry the fuel type
  // -------------------------------------------------------------------------
  const stationsWithFuel = stations.filter(
    (s) => getPrice(s, fuelType) !== null
  );

  // -------------------------------------------------------------------------
  // Step 2: Filter to stations near the route
  // -------------------------------------------------------------------------
  const nearRoute = stationsWithFuel.filter((s) => {
    const stationLatLng = { lat: s.latitude, lng: s.longitude };
    const dist = distanceToPolylineKm(stationLatLng, routePolyline);
    return dist <= MAX_DETOUR_RADIUS_KM;
  });

  // -------------------------------------------------------------------------
  // Step 3: Filter to reachable stations
  // (station must be within range given current fuel, with a small buffer)
  // -------------------------------------------------------------------------
  const reachable = nearRoute.filter((s) => {
    const stationLatLng = { lat: s.latitude, lng: s.longitude };
    // Approximate road distance to station from current position
    const fraction = fractionAlongRoute(
      stationLatLng,
      routePolyline,
      routeDistanceKm
    );
    const distanceToStationKm = fraction * routeDistanceKm;
    const offRouteKm = distanceToPolylineKm(stationLatLng, routePolyline);
    const totalKmToReach = distanceToStationKm + offRouteKm;
    const fuelToReach = (totalKmToReach * efficiency) / 100;
    return currentFuelL >= fuelToReach;
  });

  // -------------------------------------------------------------------------
  // Step 4: Score all candidates vs Victorian median baseline
  // -------------------------------------------------------------------------
  const litresNeeded = tankCapacityL - currentFuelL;

  const allScored = reachable.map((s) => {
    const stationLatLng = { lat: s.latitude, lng: s.longitude };
    const offRouteKm = distanceToPolylineKm(stationLatLng, routePolyline);
    const detourDistanceKm = estimateDetourKm(offRouteKm);
    const stationPrice = getPrice(s, fuelType)!;
    const isOnRoute = detourDistanceKm <= ON_ROUTE_THRESHOLD_KM;

    return {
      ...s,
      detourDistanceKm,
      selectedFuelPrice: stationPrice,
      isOnRoute,
      // Saving vs median — will be overridden for off-route stations below
      netSavingDollars: calculateNetSaving({
        stationPriceCentsPerL: stationPrice,
        baselinePriceCentsPerL: baselinePrice,
        litresNeeded,
        detourDistanceKm,
        efficiency,
      }),
      isMarginal: false, // set after split
    };
  });

  // -------------------------------------------------------------------------
  // Step 5: Split into on-route and off-route
  // -------------------------------------------------------------------------
  const onRouteStations: RankedStation[] = allScored
    .filter((s) => s.isOnRoute)
    .sort((a, b) => a.selectedFuelPrice - b.selectedFuelPrice) // cheapest first
    .slice(0, TOP_N)
    .map((s) => ({
      ...s,
      isMarginal: s.netSavingDollars > 0 && s.netSavingDollars < MARGINAL_SAVING_THRESHOLD_DOLLARS,
    }));

  // Cheapest on-route price is the baseline for off-route comparisons
  const cheapestOnRoutePriceCents =
    onRouteStations[0]?.selectedFuelPrice ?? null;

  const offRouteBaseline = cheapestOnRoutePriceCents ?? baselinePrice;

  const offRouteStations: RankedStation[] = allScored
    .filter((s) => !s.isOnRoute)
    .map((s) => {
      const netSavingDollars = calculateNetSaving({
        stationPriceCentsPerL: s.selectedFuelPrice,
        baselinePriceCentsPerL: offRouteBaseline,
        litresNeeded,
        detourDistanceKm: s.detourDistanceKm,
        efficiency,
      });
      return {
        ...s,
        netSavingDollars,
        isMarginal: netSavingDollars > 0 && netSavingDollars < MARGINAL_SAVING_THRESHOLD_DOLLARS,
      };
    })
    .sort((a, b) => b.netSavingDollars - a.netSavingDollars)
    .slice(0, TOP_N);

  // -------------------------------------------------------------------------
  // Step 6: Recommendation
  // -------------------------------------------------------------------------
  const bestOnRoute = onRouteStations[0];
  const bestOffRoute = offRouteStations[0];

  const hasMeaningfulSaving =
    (bestOnRoute !== undefined && bestOnRoute.netSavingDollars >= MARGINAL_SAVING_THRESHOLD_DOLLARS) ||
    (bestOffRoute !== undefined && bestOffRoute.netSavingDollars >= MARGINAL_SAVING_THRESHOLD_DOLLARS);

  const recommendation =
    onRouteStations.length === 0 && offRouteStations.length === 0
      ? 'no_data'
      : hasMeaningfulSaving
        ? 'stop'
        : 'skip';

  const topStations = [...onRouteStations, ...offRouteStations];

  return {
    needsToStop: !canCompleteWithoutStop,
    recommendation,
    onRouteStations,
    offRouteStations,
    topStations,
    cheapestOnRoutePriceCents,
    medianPriceCents: baselinePrice,
    tripStats,
  };
}
