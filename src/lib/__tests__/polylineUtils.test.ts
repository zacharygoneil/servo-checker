import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  distanceToPolylineKm,
  estimateDetourKm,
  fractionAlongRoute,
} from '../polylineUtils';
import type { LatLng } from '../../types';

// Melbourne CBD as a reference point
const CBD: LatLng = { lat: -37.814, lng: 144.963 };

// ~111 km north of CBD (1° latitude ≈ 111 km)
const BENDIGO: LatLng = { lat: -36.758, lng: 144.279 };

// A simple straight route: CBD → Bendigo (very roughly)
const STRAIGHT_ROUTE: LatLng[] = [
  { lat: -37.814, lng: 144.963 },
  { lat: -37.5, lng: 144.8 },
  { lat: -37.2, lng: 144.6 },
  { lat: -36.9, lng: 144.4 },
  { lat: -36.758, lng: 144.279 },
];

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(CBD, CBD)).toBe(0);
  });

  it('returns ~111 km for 1 degree of latitude', () => {
    const a: LatLng = { lat: 0, lng: 0 };
    const b: LatLng = { lat: 1, lng: 0 };
    // 2 * 6371 * asin(sin(0.5°)) = 111.19 km for our spherical Earth model
    expect(haversineKm(a, b)).toBeCloseTo(111.19, 0);
  });

  it('is symmetric', () => {
    const d1 = haversineKm(CBD, BENDIGO);
    const d2 = haversineKm(BENDIGO, CBD);
    expect(d1).toBeCloseTo(d2, 10);
  });

  it('Melbourne to Bendigo is roughly 130–160 km', () => {
    const d = haversineKm(CBD, BENDIGO);
    expect(d).toBeGreaterThan(130);
    expect(d).toBeLessThan(160);
  });
});

describe('distanceToPolylineKm', () => {
  it('returns Infinity for empty polyline', () => {
    expect(distanceToPolylineKm(CBD, [])).toBe(Infinity);
  });

  it('returns haversine distance for single-point polyline', () => {
    const result = distanceToPolylineKm(CBD, [BENDIGO]);
    expect(result).toBeCloseTo(haversineKm(CBD, BENDIGO), 5);
  });

  it('returns ~0 for a point that lies on the polyline', () => {
    // Use one of the route waypoints itself
    const onRoute = STRAIGHT_ROUTE[2];
    const dist = distanceToPolylineKm(onRoute, STRAIGHT_ROUTE);
    expect(dist).toBeLessThan(0.1);
  });

  it('returns ~0 for a point at the start of the polyline', () => {
    const dist = distanceToPolylineKm(STRAIGHT_ROUTE[0], STRAIGHT_ROUTE);
    expect(dist).toBe(0);
  });

  it('returns non-zero for a point clearly off the route', () => {
    // Geelong is well south-west of the CBD→Bendigo route
    const GEELONG: LatLng = { lat: -38.15, lng: 144.35 };
    const dist = distanceToPolylineKm(GEELONG, STRAIGHT_ROUTE);
    expect(dist).toBeGreaterThan(20);
  });

  it('a point 1 km perpendicular from a horizontal segment measures ~1 km', () => {
    // Horizontal segment along a latitude
    const segment: LatLng[] = [
      { lat: -37.0, lng: 144.0 },
      { lat: -37.0, lng: 145.0 },
    ];
    // Point 1° of latitude north (~111 km) ← too far; use a small offset
    // 0.009° ≈ 1 km
    const point: LatLng = { lat: -37.0 + 0.009, lng: 144.5 };
    const dist = distanceToPolylineKm(point, segment);
    expect(dist).toBeCloseTo(1.0, 0); // within 0.5 km
  });
});

describe('estimateDetourKm', () => {
  it('returns 0 for a point on the route', () => {
    expect(estimateDetourKm(0)).toBe(0);
  });

  it('applies 2× round-trip and road factor', () => {
    // 1 km off-route → 2 * 1 * 1.3 = 2.6 km
    expect(estimateDetourKm(1)).toBeCloseTo(2.6, 5);
  });

  it('scales linearly', () => {
    expect(estimateDetourKm(2)).toBeCloseTo(estimateDetourKm(1) * 2, 5);
  });
});

describe('fractionAlongRoute', () => {
  it('returns 0 for an empty path', () => {
    expect(fractionAlongRoute(CBD, [], 100)).toBe(0);
  });

  it('returns ~0 for a station at the route start', () => {
    const f = fractionAlongRoute(STRAIGHT_ROUTE[0], STRAIGHT_ROUTE, 150);
    expect(f).toBeCloseTo(0, 2);
  });

  it('returns ~1 for a station at the route end', () => {
    // Compute the actual total distance of the fixture so the denominator matches
    const actualTotalKm = STRAIGHT_ROUTE.slice(1).reduce(
      (sum, pt, i) => sum + haversineKm(STRAIGHT_ROUTE[i], pt),
      0
    );
    const f = fractionAlongRoute(
      STRAIGHT_ROUTE[STRAIGHT_ROUTE.length - 1],
      STRAIGHT_ROUTE,
      actualTotalKm
    );
    expect(f).toBeCloseTo(1, 1);
  });

  it('returns a value between 0 and 1 for a mid-route station', () => {
    const midPoint = STRAIGHT_ROUTE[2]; // index 2 of 4
    const f = fractionAlongRoute(midPoint, STRAIGHT_ROUTE, 150);
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(1);
  });
});
