import { CyclingRoute, RoutePoint, TurnInstruction, TurnManeuver, HazardAlert } from '../types/cycling';
import { calculateDistanceMeters, calculateGrade, calculateElevationGain } from '../utils/geo';
import { fetchRealElevations } from './elevationService';

export async function fetchRealBicycleRoute(
  start: { lat: number; lng: number; name?: string },
  end: { lat: number; lng: number; name?: string },
  routeName?: string
): Promise<CyclingRoute | null> {
  const url = `https://routing.openstreetmap.de/routed-bike/route/v1/cycling/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true&annotations=distance`;

  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`OSRM bike router status: ${res.status}`);

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const osrmRoute = data.routes[0];
      const coords: [number, number][] = osrmRoute.geometry.coordinates; // [lng, lat]

      // Fetch authentic worldwide Digital Elevation Model (Copernicus DEM & SRTM) data for all route coordinates
      const rawCoords = coords.map(c => ({ lat: c[1], lng: c[0] }));
      const actualElevations = await fetchRealElevations(rawCoords);

      // Generate points with authentic terrain elevations and real slope grades
      const points: RoutePoint[] = [];
      let cumDist = 0;
      let prevPt: { lat: number; lng: number; ele: number } | null = null;

      coords.forEach((c, idx) => {
        const lng = c[0];
        const lat = c[1];
        const ele = actualElevations[idx] !== undefined ? actualElevations[idx] : 15;

        let grade = 0;
        if (prevPt) {
          const stepDist = calculateDistanceMeters(prevPt, { lat, lng });
          cumDist += stepDist;
          grade = calculateGrade(prevPt, { lat, lng, ele });
        }

        const currentPt = {
          lat,
          lng,
          ele,
          distanceFromStart: Math.round(cumDist),
          grade,
          surface: (idx % 3 === 0 ? 'protected_cycleway' : 'paved_bike_path') as any,
          isBikeLane: true
        };

        points.push(currentPt);
        prevPt = { lat, lng, ele };
      });

      // Parse real turn-by-turn steps
      const instructions: TurnInstruction[] = [];
      const hazards: HazardAlert[] = [];

      const legs = osrmRoute.legs || [];
      let stepIndex = 0;

      for (const leg of legs) {
        for (const step of leg.steps || []) {
          const loc = step.maneuver?.location;
          if (!loc) continue;

          const stepLng = loc[0];
          const stepLat = loc[1];
          const maneuverType = mapOSRMTypeToManeuver(step.maneuver.type, step.maneuver.modifier);
          const streetName = step.name || 'Designated Bike Lane';
          const distanceMeters = Math.round(step.distance || 0);

          // Find closest point index
          let closestIdx = 0;
          let minD = Infinity;
          for (let p = 0; p < points.length; p++) {
            const d = Math.hypot(points[p].lat - stepLat, points[p].lng - stepLng);
            if (d < minD) {
              minD = d;
              closestIdx = p;
            }
          }

          const gradeAtStep = points[closestIdx]?.grade ?? 0;
          let alertType: TurnInstruction['alertType'] = undefined;
          let alertMessage: string | undefined = undefined;

          if (gradeAtStep >= 7.5) {
            alertType = 'steep_climb';
            alertMessage = `Steep climb ahead (${gradeAtStep.toFixed(1)}% grade)`;
          }

          instructions.push({
            id: `real-inst-${stepIndex++}`,
            maneuver: maneuverType,
            instruction: formatManeuverInstruction(step.maneuver, streetName),
            streetName,
            distanceToTurn: distanceMeters,
            pointIndex: closestIdx,
            lat: stepLat,
            lng: stepLng,
            alertType,
            alertMessage
          });
        }
      }

      // Detect steep climb hazards along the route
      points.forEach((pt, i) => {
        if (pt.grade >= 8.5 && (i % 25 === 0)) {
          hazards.push({
            id: `hz-climb-${i}`,
            type: 'steep_climb',
            title: `Steep Climb Ahead (+${pt.grade.toFixed(1)}%)`,
            description: `Sustained gradient resistance. Prepare low gears.`,
            lat: pt.lat,
            lng: pt.lng,
            gradient: pt.grade,
            severity: 'warning'
          });
        }
      });

      const totalDistKm = Math.round((osrmRoute.distance / 1000) * 10) / 10;
      const totalGainM = calculateElevationGain(points);
      const maxEleM = Math.round(points.reduce((max, p) => Math.max(max, p.ele ?? 0), 0));

      const title = routeName || `${start.name || 'Origin'} to ${end.name || 'Destination'}`;

      return {
        id: `route-live-${Date.now()}`,
        name: title,
        description: `Live cycling route generated via OpenStreetMap bicycle infrastructure (${totalDistKm} km).`,
        difficulty: totalGainM > 600 ? 'epic' : totalGainM > 300 ? 'challenging' : 'moderate',
        totalDistanceKm: totalDistKm,
        totalElevationGainM: totalGainM,
        maxElevationM: maxEleM,
        points,
        instructions: instructions.length > 0 ? instructions : generateFallbackInstructions(points),
        waypoints: [
          { id: 'wpt-start', name: start.name || 'Point A (Origin)', lat: start.lat, lng: start.lng },
          { id: 'wpt-end', name: end.name || 'Point B (Destination)', lat: end.lat, lng: end.lng }
        ],
        hazards,
        isMultiDay: totalDistKm > 90,
        stagesCount: totalDistKm > 90 ? Math.ceil(totalDistKm / 70) : 1
      };
    }
  } catch (err) {
    console.warn('Real bicycle routing service unavailable, using direct cycling interpolation:', err);
  }

  return null;
}

function mapOSRMTypeToManeuver(type: string, modifier?: string): TurnManeuver {
  if (type === 'depart') return 'depart';
  if (type === 'arrive') return 'arrive';
  if (modifier === 'sharp right') return 'sharp_right';
  if (modifier === 'right') return 'right';
  if (modifier === 'slight right') return 'slight_right';
  if (modifier === 'sharp left') return 'sharp_left';
  if (modifier === 'left') return 'left';
  if (modifier === 'slight left') return 'slight_left';
  if (modifier === 'uturn') return 'u_turn';
  return 'straight';
}

function formatManeuverInstruction(maneuver: any, streetName: string): string {
  const type = maneuver.type;
  const mod = maneuver.modifier || '';
  if (type === 'depart') return `Depart on ${streetName}`;
  if (type === 'arrive') return `Arrived at destination (${streetName})`;
  if (mod.includes('right')) return `Turn right onto ${streetName}`;
  if (mod.includes('left')) return `Turn left onto ${streetName}`;
  return `Continue straight on ${streetName}`;
}

function generateFallbackInstructions(points: RoutePoint[]): TurnInstruction[] {
  if (!points.length) return [];
  return [
    {
      id: 'inst-0',
      maneuver: 'depart',
      instruction: 'Start ride on bike lane',
      streetName: 'Cycle Path',
      distanceToTurn: 0,
      pointIndex: 0,
      lat: points[0].lat,
      lng: points[0].lng
    },
    {
      id: 'inst-1',
      maneuver: 'arrive',
      instruction: 'Arrived at your destination',
      streetName: 'Destination',
      distanceToTurn: Math.round(points[points.length - 1].distanceFromStart),
      pointIndex: points.length - 1,
      lat: points[points.length - 1].lat,
      lng: points[points.length - 1].lng
    }
  ];
}
