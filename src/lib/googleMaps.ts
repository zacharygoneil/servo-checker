import type { LatLng } from '../types';

// ---------------------------------------------------------------------------
// Type conversion
// ---------------------------------------------------------------------------

/**
 * Convert a google.maps.LatLng (which exposes .lat() and .lng() methods)
 * to our plain LatLng object used throughout the pure-function layer.
 */
export function toLatLng(point: google.maps.LatLng): LatLng {
  return { lat: point.lat(), lng: point.lng() };
}

/**
 * Convert a plain LatLng to a google.maps.LatLngLiteral for use in Maps API calls.
 */
export function toLatLngLiteral(point: LatLng): google.maps.LatLngLiteral {
  return { lat: point.lat, lng: point.lng };
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export interface RouteResult {
  /** Decoded polyline as plain LatLng objects, ready for the optimiser. */
  polyline: LatLng[];
  distanceKm: number;
  durationMinutes: number;
  /** The raw response, kept in case the UI needs legs / steps. */
  raw: google.maps.DirectionsResult;
}

/**
 * Fetch a driving route from the Google Maps Directions API.
 *
 * @param origin      Current user location (from GPS).
 * @param destination A Google Maps place_id string from Places Autocomplete,
 *                    or a plain address string as fallback.
 */
export async function getRoute(
  origin: LatLng,
  destination: string
): Promise<RouteResult> {
  const service = new google.maps.DirectionsService();

  const isPlaceId = destination.startsWith('place_id:') || !destination.includes(' ');

  const result = await service.route({
    origin: toLatLngLiteral(origin),
    destination: isPlaceId ? { placeId: destination.replace('place_id:', '') } : destination,
    travelMode: google.maps.TravelMode.DRIVING,
  });

  if (!result.routes[0]) {
    throw new Error('Directions API returned no routes');
  }

  const route = result.routes[0];
  const leg = route.legs[0];

  // overview_path is already a decoded LatLng[] — use it directly rather than
  // re-decoding overview_polyline (which is { points: string }, not a raw string).
  const polyline = route.overview_path.map(toLatLng);

  const distanceKm = (leg.distance?.value ?? 0) / 1000;
  const durationMinutes = Math.round((leg.duration?.value ?? 0) / 60);

  return { polyline, distanceKm, durationMinutes, raw: result };
}

// ---------------------------------------------------------------------------
// Navigation deep-link
// ---------------------------------------------------------------------------

/**
 * Build a Google Maps URL that routes origin → fuel stop → destination.
 * Opens in the Google Maps app on mobile or the website on desktop.
 */
export function buildNavigationUrl(
  origin: LatLng,
  destination: string,
  waypointLat: number,
  waypointLng: number
): string {
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination,
    waypoints: `${waypointLat},${waypointLng}`,
    travelmode: 'driving',
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
