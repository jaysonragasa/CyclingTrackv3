import { FitnessLevel, RoutePoint, SurfaceType, CyclingRoute } from '../types/cycling';

export interface FitnessConfig {
  name: string;
  baseFlatSpeedKmh: number;
  climbTolerance: number; // 1.0 is normal, 1.8 is pro, 2.5 is ebike assist
  descendingConfidence: number;
  description: string;
}

export const FITNESS_PROFILES: Record<FitnessLevel, FitnessConfig> = {
  casual: {
    name: 'Casual Cruiser',
    baseFlatSpeedKmh: 15,
    climbTolerance: 0.8,
    descendingConfidence: 0.85,
    description: 'Relaxed tempo, stops for photos, prefers flat gentle routes'
  },
  commuter: {
    name: 'Daily Commuter',
    baseFlatSpeedKmh: 20,
    climbTolerance: 1.0,
    descendingConfidence: 1.0,
    description: 'Steady city pace, confident in bike lanes and moderate gradients'
  },
  enthusiast: {
    name: 'Sportive / Enthusiast',
    baseFlatSpeedKmh: 25,
    climbTolerance: 1.3,
    descendingConfidence: 1.15,
    description: 'Drop bar road/gravel rider, embraces climbs and sustained effort'
  },
  pro: {
    name: 'Competitive / Pro',
    baseFlatSpeedKmh: 31,
    climbTolerance: 1.6,
    descendingConfidence: 1.3,
    description: 'High power output, aero efficiency, fast hill-climbing'
  },
  ebike: {
    name: 'E-Bike (Pedelec)',
    baseFlatSpeedKmh: 24,
    climbTolerance: 2.2, // Motor assists significantly on uphills
    descendingConfidence: 1.0,
    description: 'Motor-assisted 25 km/h limit, flattens out steep gradients'
  }
};

export const SURFACE_SPEED_FACTORS: Record<SurfaceType, number> = {
  paved_bike_path: 1.05,
  protected_cycleway: 1.0,
  road_shoulder: 0.95,
  gravel: 0.78,
  unpaved: 0.65
};

/**
 * Calculates estimated speed (km/h) for a specific segment point given grade, surface, and rider fitness.
 */
export function estimatePointSpeed(
  grade: number,
  surface: SurfaceType,
  fitness: FitnessLevel
): number {
  const profile = FITNESS_PROFILES[fitness];
  let speed = profile.baseFlatSpeedKmh;

  // Grade effect
  if (grade > 0) {
    // Climbing: steep grades slow down dramatically
    // E-bike is much less penalized
    const climbPenaltyPerPercent = fitness === 'ebike' ? 0.35 : (0.75 / profile.climbTolerance);
    const speedReduction = grade * climbPenaltyPerPercent;
    speed = Math.max(fitness === 'ebike' ? 12 : 5.5, speed - speedReduction);
  } else if (grade < 0) {
    // Descending: speed bonus up to safe maximum
    const descGrade = Math.abs(grade);
    const bonus = Math.min(descGrade * 1.5 * profile.descendingConfidence, 25);
    speed = Math.min(speed + bonus, 52); // Cap safe descent speed at 52 km/h
  }

  // Surface multiplier
  const surfaceFactor = SURFACE_SPEED_FACTORS[surface] ?? 1.0;
  speed *= surfaceFactor;

  return Math.round(speed * 10) / 10;
}

/**
 * Calculates overall trip duration in minutes for an array of route points.
 */
export function estimateTripDurationMinutes(
  points: RoutePoint[],
  fitness: FitnessLevel
): { totalMinutes: number; averageSpeedKmh: number } {
  if (points.length < 2) {
    return { totalMinutes: 0, averageSpeedKmh: FITNESS_PROFILES[fitness].baseFlatSpeedKmh };
  }

  let totalHours = 0;
  let totalDistanceKm = 0;

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];
    const segmentDistMeters = Math.max(0, p2.distanceFromStart - p1.distanceFromStart);
    const segmentDistKm = segmentDistMeters / 1000;
    totalDistanceKm += segmentDistKm;

    const segmentGrade = p2.grade;
    const segmentSurface = p2.surface;
    const speedKmh = estimatePointSpeed(segmentGrade, segmentSurface, fitness);

    if (speedKmh > 0) {
      totalHours += segmentDistKm / speedKmh;
    }
  }

  const totalMinutes = Math.round(totalHours * 60);
  const averageSpeedKmh = totalHours > 0 ? Math.round((totalDistanceKm / totalHours) * 10) / 10 : FITNESS_PROFILES[fitness].baseFlatSpeedKmh;

  return { totalMinutes, averageSpeedKmh };
}

/**
 * Calculates per-segment speed and duration for multi-stage tours.
 */
export function estimateSegmentStats(
  route: CyclingRoute,
  stageIndex: number,
  fitness: FitnessLevel
): { distanceKm: number; elevationGainM: number; durationMinutes: number; avgSpeedKmh: number } {
  const points = route.points;
  if (!points.length) {
    return { distanceKm: 0, elevationGainM: 0, durationMinutes: 0, avgSpeedKmh: 20 };
  }

  const stagesCount = Math.max(1, route.stagesCount || 1);
  const segmentLength = Math.floor(points.length / stagesCount);
  const startIdx = stageIndex * segmentLength;
  const endIdx = stageIndex === stagesCount - 1 ? points.length - 1 : (stageIndex + 1) * segmentLength;

  const segmentPoints = points.slice(startIdx, endIdx + 1);
  const { totalMinutes, averageSpeedKmh } = estimateTripDurationMinutes(segmentPoints, fitness);

  const startDist = segmentPoints[0]?.distanceFromStart ?? 0;
  const endDist = segmentPoints[segmentPoints.length - 1]?.distanceFromStart ?? 0;
  const distanceKm = Math.round(((endDist - startDist) / 1000) * 10) / 10;

  let elevationGainM = 0;
  for (let i = 1; i < segmentPoints.length; i++) {
    const diff = (segmentPoints[i].ele ?? 0) - (segmentPoints[i - 1].ele ?? 0);
    if (diff > 0.5) elevationGainM += diff;
  }

  return {
    distanceKm: distanceKm || (route.totalDistanceKm / stagesCount),
    elevationGainM: Math.round(elevationGainM) || Math.round(route.totalElevationGainM / stagesCount),
    durationMinutes: totalMinutes,
    avgSpeedKmh: averageSpeedKmh
  };
}

export interface CustomSegment {
  segmentIndex: number;
  title: string;
  startDistanceKm: number;
  endDistanceKm: number;
  distanceKm: number;
  elevationGainM: number;
  maxAltitudeM: number;
  minAltitudeM: number;
  avgGrade: number;
  durationMinutes: number;
  avgSpeedKmh: number;
  startPointIdx: number;
  endPointIdx: number;
}

/**
 * Calculates segment statistics for custom slider-defined split boundaries (0 to 100%)
 * using the rider's custom preferred speed (km/h).
 */
export function calculateCustomSegmentsWithSpeed(
  points: RoutePoint[],
  splitPercentages: number[], // e.g. [35, 70] for 3 segments
  preferredSpeedKmh: number = 22
): CustomSegment[] {
  if (!points.length) return [];

  // Sort and sanitize split percentages between 0 and 100
  const validSplits = [...splitPercentages]
    .map(p => Math.max(5, Math.min(95, p)))
    .sort((a, b) => a - b);

  // Boundaries: [0, split1, split2, ..., 100]
  const boundaries = [0, ...validSplits, 100];
  const segments: CustomSegment[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const startPct = boundaries[i];
    const endPct = boundaries[i + 1];

    const startIdx = Math.min(points.length - 1, Math.floor((startPct / 100) * (points.length - 1)));
    const endIdx = Math.min(points.length - 1, Math.ceil((endPct / 100) * (points.length - 1)));

    const segPoints = points.slice(startIdx, Math.max(startIdx + 1, endIdx + 1));
    const startDistM = points[startIdx]?.distanceFromStart ?? 0;
    const endDistM = points[endIdx]?.distanceFromStart ?? 0;
    const distanceKm = Math.round(((endDistM - startDistM) / 1000) * 10) / 10;

    let eleGain = 0;
    let maxAlt = points[startIdx]?.ele ?? 0;
    let minAlt = points[startIdx]?.ele ?? 0;
    let totalGrade = 0;
    let segHours = 0;

    for (let j = 0; j < segPoints.length; j++) {
      const pt = segPoints[j];
      const alt = pt.ele ?? 0;
      if (alt > maxAlt) maxAlt = alt;
      if (alt < minAlt) minAlt = alt;
      totalGrade += pt.grade;

      if (j > 0) {
        const prev = segPoints[j - 1];
        const dM = Math.max(0, pt.distanceFromStart - prev.distanceFromStart);
        const dKm = dM / 1000;
        const diff = (pt.ele ?? 0) - (prev.ele ?? 0);
        if (diff > 0.5) eleGain += diff;

        // Dynamic speed based on preferred speed & gradient
        let pointSpeed = preferredSpeedKmh;
        if (pt.grade > 0) {
          // Slow down on climbs
          const climbReduction = pt.grade * 0.75;
          pointSpeed = Math.max(6, preferredSpeedKmh - climbReduction);
        } else if (pt.grade < 0) {
          // Speed up on safe descent
          const descentBonus = Math.min(Math.abs(pt.grade) * 1.2, 18);
          pointSpeed = Math.min(preferredSpeedKmh + descentBonus, 50);
        }

        if (pointSpeed > 0) {
          segHours += dKm / pointSpeed;
        }
      }
    }

    const durationMinutes = Math.max(1, Math.round(segHours * 60));
    const avgSpeed = segHours > 0 ? Math.round((distanceKm / segHours) * 10) / 10 : preferredSpeedKmh;
    const avgGrade = segPoints.length ? Math.round((totalGrade / segPoints.length) * 10) / 10 : 0;

    segments.push({
      segmentIndex: i + 1,
      title: `Segment ${i + 1} (${Math.round(startPct)}% - ${Math.round(endPct)}%)`,
      startDistanceKm: Math.round((startDistM / 1000) * 10) / 10,
      endDistanceKm: Math.round((endDistM / 1000) * 10) / 10,
      distanceKm: Math.max(0.1, distanceKm),
      elevationGainM: Math.round(eleGain),
      maxAltitudeM: Math.round(maxAlt),
      minAltitudeM: Math.round(minAlt),
      avgGrade,
      durationMinutes,
      avgSpeedKmh: avgSpeed,
      startPointIdx: startIdx,
      endPointIdx: endIdx
    });
  }

  return segments;
}

/**
 * Formats minutes into human readable hours & mins (e.g. "2h 45m" or "45m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  return `${hours}h ${remainingMins}m`;
}

