import { LatLng, RoutePoint, BikePOI } from '../types/cycling';

const EARTH_RADIUS_METERS = 6371000;

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates Haversine distance between two coordinates in meters.
 */
export function calculateDistanceMeters(a: LatLng, b: LatLng): number {
  const dLat = degreesToRadians(b.lat - a.lat);
  const dLng = degreesToRadians(b.lng - a.lng);
  const lat1 = degreesToRadians(a.lat);
  const lat2 = degreesToRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return Math.round(EARTH_RADIUS_METERS * c * 10) / 10;
}

/**
 * Calculates initial compass bearing (heading) from point A to point B in degrees (0-360).
 */
export function calculateBearing(a: LatLng, b: LatLng): number {
  const lat1 = degreesToRadians(a.lat);
  const lat2 = degreesToRadians(b.lat);
  const dLng = degreesToRadians(b.lng - a.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let bearing = (radiansToDegrees(Math.atan2(y, x)) + 360) % 360;
  return Math.round(bearing * 10) / 10;
}

/**
 * Calculates percentage grade between two points given distance and elevation.
 */
export function calculateGrade(p1: LatLng, p2: LatLng): number {
  const dist = calculateDistanceMeters(p1, p2);
  if (dist < 5) return 0; // Avoid division by near zero
  const ele1 = p1.ele ?? 0;
  const ele2 = p2.ele ?? 0;
  const deltaEle = ele2 - ele1;
  const grade = (deltaEle / dist) * 100;
  return Math.round(grade * 10) / 10;
}

/**
 * Calculates total positive elevation gain across an array of points.
 */
export function calculateElevationGain(points: LatLng[]): number {
  let totalGain = 0;
  for (let i = 1; i < points.length; i++) {
    const e1 = points[i - 1].ele ?? 0;
    const e2 = points[i].ele ?? 0;
    const diff = e2 - e1;
    // Apply a small noise threshold to avoid GPS altitude jitter
    if (diff > 0.5) {
      totalGain += diff;
    }
  }
  return Math.round(totalGain);
}

/**
 * Finds the index of the closest point on the route to the current coordinate.
 */
export function findNearestPointIndex(points: RoutePoint[], current: LatLng): number {
  if (!points.length) return 0;
  let minIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < points.length; i++) {
    const d = calculateDistanceMeters(points[i], current);
    if (d < minDistance) {
      minDistance = d;
      minIndex = i;
    }
  }
  return minIndex;
}

/**
 * Sorts and computes distance from a coordinate to a list of Bike POIs.
 */
export function getNearbyPOIsWithDistance(pois: BikePOI[], current: LatLng, maxRadiusKm: number = 25): BikePOI[] {
  return pois
    .map(poi => {
      const dist = calculateDistanceMeters(current, { lat: poi.lat, lng: poi.lng });
      return {
        ...poi,
        distanceMeters: Math.round(dist)
      };
    })
    .filter(poi => (poi.distanceMeters ?? 0) <= maxRadiusKm * 1000)
    .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
}

/**
 * Helper to format distance cleanly (e.g. 850 m or 14.2 km)
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Helper to format elevation cleanly (e.g. 142 m or 466 ft)
 */
export function formatElevation(meters: number, useImperial = false): string {
  if (useImperial) {
    return `${Math.round(meters * 3.28084)} ft`;
  }
  return `${Math.round(meters)} m`;
}
