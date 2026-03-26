// ---------------------------------------------------------------------------
// Geo primitives
// ---------------------------------------------------------------------------

/**
 * Plain lat/lng coordinate. The pure-function layer uses this instead of
 * google.maps.LatLng so the optimiser and polylineUtils are testable without
 * the Maps SDK loaded. Convert google.maps.LatLng → LatLng with toLatLng().
 */
export interface LatLng {
  lat: number;
  lng: number;
}

// ---------------------------------------------------------------------------
// Servo Saver API types
// ---------------------------------------------------------------------------

export interface FuelPrice {
  fuel_type: string; // "U91" | "U95" | "U98" | "E10" | "Diesel" | "LPG"
  price: number; // cents per litre
  last_updated: string; // ISO timestamp
  tomorrow_price_cap?: number;
}

export interface FuelStation {
  site_id: string;
  name: string;
  brand: string;
  address: string;
  suburb: string;
  postcode: string;
  latitude: number;
  longitude: number;
  fuel_types: FuelPrice[];
  opening_hours?: string;
}

// ---------------------------------------------------------------------------
// Optimiser I/O
// ---------------------------------------------------------------------------

export interface OptimiserInput {
  /** Decoded route path as plain LatLng objects */
  routePolyline: LatLng[];
  routeDistanceKm: number;
  stations: FuelStation[];
  fuelType: string;
  tankCapacityL: number;
  currentFuelL: number;
  vehicleEfficiencyLper100km: number;
  /**
   * Price (cents/L) the user would pay if they don't stop early.
   * Falls back to median of all stations for the selected fuel type when omitted.
   */
  currentFuelPriceEstimate?: number;
}

export interface RankedStation extends FuelStation {
  detourDistanceKm: number;
  /** On-route: vs Victorian median. Off-route: vs cheapest on-route minus detour fuel cost. */
  netSavingDollars: number;
  isMarginal: boolean;
  selectedFuelPrice: number;
  /** True if the station is within ON_ROUTE_THRESHOLD_KM of the route polyline. */
  isOnRoute: boolean;
}

export interface OptimiserResult {
  needsToStop: boolean;
  recommendation: 'stop' | 'skip' | 'no_data';
  /** On-route stations sorted cheapest first. */
  onRouteStations: RankedStation[];
  /** Off-route stations sorted by net saving vs cheapest on-route, descending. */
  offRouteStations: RankedStation[];
  /** All stations combined — used for map markers. */
  topStations: RankedStation[];
  /** Cheapest on-route price in cents/L — used as the off-route saving baseline. */
  cheapestOnRoutePriceCents: number | null;
  /** Victorian median price in cents/L — used as the on-route saving baseline. */
  medianPriceCents: number | null;
  tripStats: {
    distanceKm: number;
    fuelNeededL: number;
    canCompleteWithoutStop: boolean;
  };
}

// ---------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------

export interface CachedStations {
  timestamp: number;
  stations: FuelStation[];
}
