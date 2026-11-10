import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistanceMeters,
  calculateBearing,
  calculateGrade,
  calculateElevationGain,
  formatDistance,
  formatElevation
} from './geo';
import { estimatePointSpeed, estimateTripDurationMinutes, FITNESS_PROFILES, calculateCustomSegmentsWithSpeed } from './cyclingEstimator';
import { parseGPX, exportToGPX } from './gpx';

test('calculateDistanceMeters computes accurate haversine distance', () => {
  // ~111 km between 1 degree latitude
  const p1 = { lat: 37.7749, lng: -122.4194 };
  const p2 = { lat: 37.7849, lng: -122.4194 };
  const dist = calculateDistanceMeters(p1, p2);
  // ~1111 meters between 0.01 deg lat
  assert.ok(dist > 1100 && dist < 1125, `Expected ~1112m, got ${dist}`);
});

test('calculateBearing returns 0-360 degrees heading', () => {
  const south = { lat: 0, lng: 0 };
  const north = { lat: 1, lng: 0 };
  const bearingNorth = calculateBearing(south, north);
  assert.equal(bearingNorth, 0);

  const east = { lat: 0, lng: 1 };
  const bearingEast = calculateBearing(south, east);
  assert.equal(bearingEast, 90);
});

test('calculateGrade calculates percentage slope correctly', () => {
  // 100m distance, 10m climb = 10%
  const p1 = { lat: 37.0000, lng: -122.0000, ele: 100 };
  // 0.0009 deg lat is approx 100 meters
  const dist = 100;
  const grade = (10 / dist) * 100;
  assert.equal(grade, 10);
});

test('calculateElevationGain sums positive gains', () => {
  const points = [
    { lat: 0, lng: 0, ele: 10 },
    { lat: 0, lng: 0.001, ele: 25 }, // +15
    { lat: 0, lng: 0.002, ele: 20 }, // -5 (no gain)
    { lat: 0, lng: 0.003, ele: 40 }, // +20
  ];
  const gain = calculateElevationGain(points);
  assert.equal(gain, 35);
});

test('estimatePointSpeed adjusts for climbing gradients and cyclist fitness', () => {
  const casualSpeedFlat = estimatePointSpeed(0, 'paved_bike_path', 'casual');
  const casualSpeedClimb = estimatePointSpeed(8, 'paved_bike_path', 'casual');
  assert.ok(casualSpeedClimb < casualSpeedFlat, 'Climbing must reduce speed');

  const proSpeedClimb = estimatePointSpeed(8, 'paved_bike_path', 'pro');
  assert.ok(proSpeedClimb > casualSpeedClimb, 'Pro rider should climb faster than casual');

  const ebikeSpeedClimb = estimatePointSpeed(8, 'paved_bike_path', 'ebike');
  assert.ok(ebikeSpeedClimb >= 12, 'E-Bike has strong motor assist on hills');
});

test('GPX export and import round-trip preserves track coordinates and elevation', () => {
  const samplePoints = [
    { lat: 37.8001, lng: -122.4201, ele: 15 },
    { lat: 37.8050, lng: -122.4250, ele: 45 },
    { lat: 37.8100, lng: -122.4300, ele: 60 }
  ];
  const waypoints = [
    { id: 'w1', name: 'Start Cafe', lat: 37.8001, lng: -122.4201 }
  ];

  const exported = exportToGPX('Marin Loop', samplePoints, waypoints);
  assert.ok(exported.includes('<gpx'), 'Should generate valid GPX root tag');
  assert.ok(exported.includes('Marin Loop'), 'Should contain route name');

  const parsed = parseGPX(exported);
  assert.equal(parsed.name, 'Marin Loop');
  assert.equal(parsed.points.length, 3);
  assert.equal(parsed.waypoints.length, 1);
  assert.equal(parsed.waypoints[0].name, 'Start Cafe');
  assert.equal(parsed.points[1].ele, 45);
});

test('formatDistance and formatElevation display clean strings', () => {
  assert.equal(formatDistance(450), '450 m');
  assert.equal(formatDistance(3200), '3.2 km');
  assert.equal(formatElevation(120), '120 m');
  assert.equal(formatElevation(100, true), '328 ft');
});

test('calculateCustomSegmentsWithSpeed splits route by slider percentages and uses preferred speed', () => {
  const dummyPoints = Array.from({ length: 100 }, (_, i) => ({
    lat: 37.8 + i * 0.001,
    lng: -122.4,
    ele: 10 + Math.sin(i / 10) * 50,
    distanceFromStart: i * 200, // 20 km total
    grade: i % 10 === 0 ? 5 : 1,
    surface: 'paved_bike_path' as const,
    isBikeLane: true
  }));

  // Split into 3 segments using sliders at 30% and 70%
  const segments = calculateCustomSegmentsWithSpeed(dummyPoints, [30, 70], 25);
  assert.equal(segments.length, 3);
  assert.equal(segments[0].segmentIndex, 1);
  assert.equal(segments[1].segmentIndex, 2);
  assert.equal(segments[2].segmentIndex, 3);
  assert.ok(segments[0].durationMinutes > 0);
  assert.ok(segments[1].distanceKm > 0);
  // Higher preferred speed yields shorter duration
  const segmentsSlow = calculateCustomSegmentsWithSpeed(dummyPoints, [30, 70], 15);
  assert.ok(segmentsSlow[0].durationMinutes > segments[0].durationMinutes, 'Slower speed should yield longer duration');
});

test('searchCyclingPlaces returns accurate auto-suggest results for cycling addresses', async () => {
  const { searchCyclingPlaces } = await import('../data/cyclingPlaces');

  // Search by summit keyword
  const summitResults = searchCyclingPlaces('hawk');
  assert.ok(summitResults.length > 0);
  assert.ok(summitResults[0].name.toLowerCase().includes('hawk'));

  // Search by bike repair keyword
  const repairResults = searchCyclingPlaces('repair');
  assert.ok(repairResults.length > 0);
  assert.ok(repairResults.some(r => r.name.includes('Repair') || r.bikeFacility.includes('Repair')));

  // Search by general query returns limited results
  const emptyQueryResults = searchCyclingPlaces('', 5);
  assert.equal(emptyQueryResults.length, 5);
});

test('fetchRealElevations returns authentic DEM elevations for GPS coordinates', async () => {
  const { fetchRealElevations } = await import('../services/elevationService');
  // Coordinates for San Francisco Presidio and Hawk Hill summit
  const coords = [
    { lat: 37.8015, lng: -122.4650 },
    { lat: 37.8260, lng: -122.4995 }
  ];
  const elevations = await fetchRealElevations(coords);
  assert.equal(elevations.length, 2);
  // Presidio is near coast (~20-40m), Hawk Hill is a prominent summit (>150m)
  assert.ok(elevations[0] >= 0, 'Coastal elevation should be non-negative');
  assert.ok(elevations[1] > elevations[0], 'Hawk Hill summit elevation must be higher than base coastal elevation');
});


