import type { LatLng } from '../types';

const EARTH_RADIUS_KM = 6371;

/** Convert degrees to radians */
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Haversine distance between two points in kilometres.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Project point P onto segment AB and return the clamped parameter t ∈ [0,1]
 * representing how far along AB the closest point lies.
 *
 * Works in a flat (equirectangular) approximation, which is accurate enough
 * for short polyline segments (≤ ~50 km) at Melbourne latitudes.
 */
function segmentClosestT(a: LatLng, b: LatLng, p: LatLng): number {
  const cosLat = Math.cos(toRad((a.lat + b.lat) / 2));
  const ax = a.lng * cosLat;
  const ay = a.lat;
  const bx = b.lng * cosLat;
  const by = b.lat;
  const px = p.lng * cosLat;
  const py = p.lat;

  const abx = bx - ax;
  const aby = by - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) return 0; // degenerate segment

  const t = ((px - ax) * abx + (py - ay) * aby) / ab2;
  return Math.max(0, Math.min(1, t));
}

/**
 * Minimum distance in km from a point to any segment of the polyline.
 *
 * Returns Infinity for an empty polyline.
 */
export function distanceToPolylineKm(
  point: LatLng,
  path: LatLng[]
): number {
  if (path.length === 0) return Infinity;
  if (path.length === 1) return haversineKm(point, path[0]);

  let minDist = Infinity;

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const t = segmentClosestT(a, b, point);
    const closest: LatLng = {
      lat: a.lat + t * (b.lat - a.lat),
      lng: a.lng + t * (b.lng - a.lng),
    };
    const dist = haversineKm(point, closest);
    if (dist < minDist) minDist = dist;
  }

  return minDist;
}

/**
 * Estimate round-trip detour distance for a station that lies `offRouteKm`
 * from the nearest point on the polyline.
 *
 * Approximation: detour = 2 × perpendicular distance × 1.3 (road-network factor).
 * A real implementation would use the Directions API for precision, but this
 * gives a conservative estimate that errs on the side of under-recommending.
 */
export function estimateDetourKm(offRouteKm: number): number {
  const ROAD_FACTOR = 1.3;
  return 2 * offRouteKm * ROAD_FACTOR;
}

/**
 * Find what fraction of the route has been completed at the closest
 * approach point of `stationLocation` to the polyline.
 *
 * Used to confirm the station is reachable before the user runs out of fuel.
 */
export function fractionAlongRoute(
  stationLocation: LatLng,
  path: LatLng[],
  totalRouteKm: number
): number {
  if (path.length < 2 || totalRouteKm === 0) return 0;

  let bestSegIndex = 0;
  let bestT = 0;
  let bestDist = Infinity;

  for (let i = 0; i < path.length - 1; i++) {
    const t = segmentClosestT(path[i], path[i + 1], stationLocation);
    const closest: LatLng = {
      lat: path[i].lat + t * (path[i + 1].lat - path[i].lat),
      lng: path[i].lng + t * (path[i + 1].lng - path[i].lng),
    };
    const dist = haversineKm(stationLocation, closest);
    if (dist < bestDist) {
      bestDist = dist;
      bestSegIndex = i;
      bestT = t;
    }
  }

  // Sum distances of all preceding segments + partial segment
  let distSoFar = 0;
  for (let i = 0; i < bestSegIndex; i++) {
    distSoFar += haversineKm(path[i], path[i + 1]);
  }
  const segLen = haversineKm(path[bestSegIndex], path[bestSegIndex + 1]);
  distSoFar += bestT * segLen;

  return distSoFar / totalRouteKm;
}
