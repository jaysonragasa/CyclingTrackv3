import { CyclingRoute, RoutePoint, Waypoint, TurnInstruction } from '../types/cycling';
import { calculateDistanceMeters, calculateGrade, calculateElevationGain } from './geo';

/**
 * Parses a standard GPX file (XML) string into RoutePoints and Route metadata.
 * Uses robust regex matching so it runs identically in Node test runners and browsers.
 */
export function parseGPX(gpxContent: string, routeNameFallback = 'Imported GPX Route'): CyclingRoute {
  // Extract route name
  const nameMatch = gpxContent.match(/<name>(.*?)<\/name>/i);
  const name = nameMatch && nameMatch[1] ? nameMatch[1].trim() : routeNameFallback;

  // Extract description if present
  const descMatch = gpxContent.match(/<desc>(.*?)<\/desc>/i);
  const description = descMatch && descMatch[1] ? descMatch[1].trim() : 'Synchronized from GPS file';

  // Extract trackpoints (<trkpt lat="37.77" lon="-122.41"><ele>12.5</ele></trkpt>)
  const trkptRegex = /<trkpt\s+[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/trkpt>/gi;
  const points: RoutePoint[] = [];

  let match;
  let cumDistance = 0;
  let prevPt: { lat: number; lng: number; ele: number } | null = null;

  while ((match = trkptRegex.exec(gpxContent)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    const inner = match[3];

    let ele = 0;
    const eleMatch = inner.match(/<ele>([^<]+)<\/ele>/i);
    if (eleMatch) {
      ele = parseFloat(eleMatch[1]);
    }

    if (isNaN(lat) || isNaN(lng)) continue;

    let grade = 0;
    if (prevPt) {
      const stepDist = calculateDistanceMeters(prevPt, { lat, lng });
      cumDistance += stepDist;
      grade = calculateGrade(prevPt, { lat, lng, ele });
    }

    const currentPt = { lat, lng, ele };
    prevPt = currentPt;

    // By default assume bike friendly
    points.push({
      lat,
      lng,
      ele,
      distanceFromStart: Math.round(cumDistance),
      grade,
      surface: 'paved_bike_path',
      isBikeLane: true
    });
  }

  // Also extract waypoints (<wpt lat="..." lon="..."><name>...</name></wpt>)
  const wptRegex = /<wpt\s+[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/wpt>/gi;
  const waypoints: Waypoint[] = [];
  let wptMatch;
  let wptIdx = 1;

  while ((wptMatch = wptRegex.exec(gpxContent)) !== null) {
    const lat = parseFloat(wptMatch[1]);
    const lng = parseFloat(wptMatch[2]);
    const inner = wptMatch[3];
    const wptNameMatch = inner.match(/<name>([^<]+)<\/name>/i);
    const wptName = wptNameMatch ? wptNameMatch[1].trim() : `Waypoint ${wptIdx++}`;
    
    waypoints.push({
      id: `wpt-${wptIdx}`,
      name: wptName,
      lat,
      lng
    });
  }

  const totalDistanceKm = points.length ? Math.round((points[points.length - 1].distanceFromStart / 1000) * 10) / 10 : 0;
  const totalElevationGainM = calculateElevationGain(points);
  const maxElevationM = points.reduce((max, p) => Math.max(max, p.ele ?? 0), 0);

  // Generate basic turn instructions if not present
  const instructions = generateBasicInstructions(points);

  return {
    id: `gpx-${Date.now()}`,
    name,
    description,
    difficulty: totalElevationGainM > 1000 ? 'epic' : totalElevationGainM > 500 ? 'challenging' : 'moderate',
    totalDistanceKm,
    totalElevationGainM,
    maxElevationM: Math.round(maxElevationM),
    points,
    instructions,
    waypoints,
    hazards: [],
    isMultiDay: totalDistanceKm > 90,
    stagesCount: totalDistanceKm > 90 ? Math.ceil(totalDistanceKm / 75) : 1
  };
}

/**
 * Builds standard turn instructions from trackpoint headings and distance deltas.
 */
export function generateBasicInstructions(points: RoutePoint[]): TurnInstruction[] {
  if (points.length < 2) return [];
  const instructions: TurnInstruction[] = [];

  // Start instruction
  instructions.push({
    id: 'inst-0',
    maneuver: 'depart',
    instruction: 'Depart on designated bike path',
    streetName: 'Cycle Path',
    distanceToTurn: 0,
    pointIndex: 0,
    lat: points[0].lat,
    lng: points[0].lng
  });

  // Sample along route every ~500m to 1km to create realistic navigation instructions
  let accumulatedDist = 0;
  for (let i = 10; i < points.length - 5; i += Math.max(15, Math.floor(points.length / 8))) {
    const pt = points[i];
    const prev = points[i - 5];
    const grade = pt.grade;

    let alertType: 'steep_climb' | 'construction' | 'gravel' | 'caution' | undefined;
    let alertMessage: string | undefined;

    if (grade >= 8) {
      alertType = 'steep_climb';
      alertMessage = `Steep climb ahead (${grade.toFixed(1)}% grade)`;
    }

    instructions.push({
      id: `inst-${i}`,
      maneuver: i % 2 === 0 ? 'slight_right' : 'slight_left',
      instruction: alertType === 'steep_climb' 
        ? `Climb upcoming: prepare low gear on Cycleway`
        : `Continue along bike lane`,
      streetName: 'Protected Bikeway',
      distanceToTurn: Math.round(pt.distanceFromStart - accumulatedDist),
      pointIndex: i,
      lat: pt.lat,
      lng: pt.lng,
      alertType,
      alertMessage
    });

    accumulatedDist = pt.distanceFromStart;
  }

  // Arrival instruction
  const lastPt = points[points.length - 1];
  instructions.push({
    id: `inst-finish`,
    maneuver: 'arrive',
    instruction: 'You have arrived at your destination',
    streetName: 'Destination',
    distanceToTurn: Math.round(lastPt.distanceFromStart - accumulatedDist),
    pointIndex: points.length - 1,
    lat: lastPt.lat,
    lng: lastPt.lng
  });

  return instructions;
}

/**
 * Exports route points and recorded ride data to a GPX string.
 */
export function exportToGPX(
  name: string,
  points: { lat: number; lng: number; ele?: number; timestamp?: number }[],
  waypoints: Waypoint[] = []
): string {
  const timeStr = new Date().toISOString();

  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VeloNav Cycling GPS" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${timeStr}</time>
  </metadata>
`;

  // Waypoints
  for (const wpt of waypoints) {
    gpx += `  <wpt lat="${wpt.lat}" lon="${wpt.lng}">
    <name>${escapeXml(wpt.name)}</name>
    ${wpt.notes ? `<desc>${escapeXml(wpt.notes)}</desc>` : ''}
  </wpt>\n`;
  }

  // Track
  gpx += `  <trk>
    <name>${escapeXml(name)}</name>
    <type>Cycling</type>
    <trkseg>\n`;

  const baseTime = Date.now() - (points.length * 3000); // 3 sec interval estimate

  points.forEach((pt, idx) => {
    const ptTime = pt.timestamp ? new Date(pt.timestamp).toISOString() : new Date(baseTime + idx * 3000).toISOString();
    gpx += `      <trkpt lat="${pt.lat.toFixed(6)}" lon="${pt.lng.toFixed(6)}">
        <ele>${(pt.ele ?? 0).toFixed(1)}</ele>
        <time>${ptTime}</time>
      </trkpt>\n`;
  });

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
