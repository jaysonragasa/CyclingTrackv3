import { CyclingRoute, BikePOI } from '../types/cycling';

export const SAMPLE_POIS: BikePOI[] = [
  {
    id: 'poi-1',
    name: 'Presidio Cycle Works & Repair',
    type: 'bike_shop',
    lat: 37.8015,
    lng: -122.4650,
    address: '101 Lincoln Blvd, San Francisco',
    isOpen: true,
    hasTools: true,
    hasPump: true,
    phone: '+1 415-555-0192'
  },
  {
    id: 'poi-2',
    name: 'Golden Gate Bridge North Vista Tool Station',
    type: 'repair_station',
    lat: 37.8324,
    lng: -122.4795,
    address: 'North Vista Point, Sausalito',
    isOpen: true,
    hasTools: true,
    hasPump: true
  },
  {
    id: 'poi-3',
    name: 'Sausalito Public Bike Pump & Water Fountain',
    type: 'bike_pump',
    lat: 37.8590,
    lng: -122.4855,
    address: 'Bridgeway Waterfront, Sausalito',
    isOpen: true,
    hasTools: false,
    hasPump: true
  },
  {
    id: 'poi-4',
    name: 'Hawk Hill Summit Emergency Station & Aid',
    type: 'emergency_aid',
    lat: 37.8258,
    lng: -122.4998,
    address: 'Conzelman Rd Lookout',
    isOpen: true,
    hasTools: true,
    phone: '911 / Park Dispatch: +1 415-561-5505'
  },
  {
    id: 'poi-5',
    name: 'Redwood Creek Camp Bike Spares & Tubes',
    type: 'repair_station',
    lat: 37.8680,
    lng: -122.5600,
    address: 'Muir Beach Trailhead',
    isOpen: true,
    hasTools: true,
    hasPump: true
  },
  {
    id: 'poi-6',
    name: 'Olema Trailhead Water Refill & Tools',
    type: 'water_refill',
    lat: 38.0410,
    lng: -122.7880,
    address: 'Highway 1 & Sir Francis Drake',
    isOpen: true,
    hasTools: true,
    hasPump: false
  },
  {
    id: 'poi-7',
    name: 'Bodega Bay Velo Clinic & Assistance',
    type: 'bike_shop',
    lat: 38.3330,
    lng: -123.0480,
    address: '1580 Coast Hwy, Bodega Bay',
    isOpen: true,
    hasTools: true,
    hasPump: true,
    phone: '+1 707-555-0144'
  }
];

// Helper to interpolate smooth route coordinates with realistic elevation curves
function createSmoothRoute(
  waypoints: { lat: number; lng: number; ele: number; grade: number; surface: any; isBikeLane: boolean; desc?: string }[],
  stepsBetween = 8
) {
  const points = [];
  let cumDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const w1 = waypoints[i];
    const w2 = waypoints[i + 1];

    for (let s = 0; s < stepsBetween; s++) {
      const t = s / stepsBetween;
      const lat = w1.lat + (w2.lat - w1.lat) * t;
      const lng = w1.lng + (w2.lng - w1.lng) * t;
      const ele = Math.round(w1.ele + (w2.ele - w1.ele) * t);

      // Distance estimation
      const dLat = (lat - (points[points.length - 1]?.lat ?? lat)) * 111000;
      const dLng = (lng - (points[points.length - 1]?.lng ?? lng)) * 88000;
      const segDist = Math.sqrt(dLat * dLat + dLng * dLng);
      cumDistance += (points.length === 0 ? 0 : segDist);

      // Grade calculation
      const grade = t > 0.5 ? w2.grade : w1.grade;

      points.push({
        lat: Math.round(lat * 1000000) / 1000000,
        lng: Math.round(lng * 1000000) / 1000000,
        ele,
        distanceFromStart: Math.round(cumDistance),
        grade,
        surface: w1.surface,
        isBikeLane: w1.isBikeLane
      });
    }
  }

  // Push final point
  const lastW = waypoints[waypoints.length - 1];
  points.push({
    lat: lastW.lat,
    lng: lastW.lng,
    ele: lastW.ele,
    distanceFromStart: Math.round(cumDistance + 120),
    grade: lastW.grade,
    surface: lastW.surface,
    isBikeLane: lastW.isBikeLane
  });

  return points;
}

// Route 1: Marin Headlands & Golden Gate Loop (Classic ride)
const marinWaypoints = [
  { lat: 37.8015, lng: -122.4650, ele: 15, grade: 0.5, surface: 'protected_cycleway', isBikeLane: true, desc: 'Presidio Promenade Bikeway' },
  { lat: 37.8090, lng: -122.4740, ele: 42, grade: 3.2, surface: 'protected_cycleway', isBikeLane: true, desc: 'Bridge South Approach' },
  { lat: 37.8180, lng: -122.4785, ele: 68, grade: 1.0, surface: 'protected_cycleway', isBikeLane: true, desc: 'Golden Gate Bridge West Bike Path' },
  { lat: 37.8310, lng: -122.4800, ele: 55, grade: -2.5, surface: 'protected_cycleway', isBikeLane: true, desc: 'Vista Point Overpass' },
  { lat: 37.8285, lng: -122.4890, ele: 110, grade: 8.8, surface: 'paved_bike_path', isBikeLane: true, desc: 'Conzelman Rd Ascent' },
  { lat: 37.8260, lng: -122.4995, ele: 280, grade: 11.2, surface: 'paved_bike_path', isBikeLane: true, desc: 'Hawk Hill Summit' },
  { lat: 37.8280, lng: -122.5150, ele: 95, grade: -9.5, surface: 'road_shoulder', isBikeLane: false, desc: 'Headlands Coastal Descent' },
  { lat: 37.8390, lng: -122.5220, ele: 35, grade: -1.2, surface: 'paved_bike_path', isBikeLane: true, desc: 'Rodeo Beach Causeway' },
  { lat: 37.8500, lng: -122.5050, ele: 72, grade: 4.5, surface: 'paved_bike_path', isBikeLane: true, desc: 'Bunker Road Tunnel Trail' },
  { lat: 37.8590, lng: -122.4855, ele: 8, grade: -3.0, surface: 'protected_cycleway', isBikeLane: true, desc: 'Sausalito Ferry Terminal & Finish' }
];

const marinPoints = createSmoothRoute(marinWaypoints, 10);

export const ROUTE_MARIN_HEADLANDS: CyclingRoute = {
  id: 'route-marin-headlands',
  name: 'Golden Gate & Hawk Hill Ridge',
  description: 'Iconic ride with dedicated bridge bike paths, dramatic ocean views, and challenging category climbs.',
  difficulty: 'challenging',
  totalDistanceKm: 24.8,
  totalElevationGainM: 520,
  maxElevationM: 284,
  points: marinPoints,
  isMultiDay: false,
  waypoints: [
    { id: 'w1', name: 'Presidio Bike Hub', lat: 37.8015, lng: -122.4650 },
    { id: 'w2', name: 'Golden Gate West Span', lat: 37.8180, lng: -122.4785 },
    { id: 'w3', name: 'Hawk Hill Summit (284m)', lat: 37.8260, lng: -122.4995, stopoverType: 'viewpoint', notes: 'Hydration stop & panoramic Pacific vistas' },
    { id: 'w4', name: 'Sausalito Marina Cafe', lat: 37.8590, lng: -122.4855, stopoverType: 'cafe' }
  ],
  instructions: [
    {
      id: 'i-1',
      maneuver: 'depart',
      instruction: 'Start ride on Presidio Dedicated Cycleway',
      streetName: 'Presidio Promenade',
      distanceToTurn: 0,
      pointIndex: 0,
      lat: 37.8015,
      lng: -122.4650
    },
    {
      id: 'i-2',
      maneuver: 'right',
      instruction: 'Turn right onto Golden Gate Bridge West Bike Path',
      streetName: 'GGB West Sidewalk (Bicycles Only)',
      distanceToTurn: 1600,
      pointIndex: 12,
      lat: 37.8180,
      lng: -122.4785
    },
    {
      id: 'i-3',
      maneuver: 'sharp_left',
      instruction: 'Caution: Steep climb ahead (8.8% to 11.2%). Switch to low gear.',
      streetName: 'Conzelman Rd (Steep Climb)',
      distanceToTurn: 2800,
      pointIndex: 35,
      lat: 37.8285,
      lng: -122.4890,
      alertType: 'steep_climb',
      alertMessage: 'Steep climb 11.2% gradient for next 1.4 km'
    },
    {
      id: 'i-4',
      maneuver: 'straight',
      instruction: 'Caution: Construction alert on coastal road shoulder. Reduce speed.',
      streetName: 'Coastal Trail Bypass',
      distanceToTurn: 2200,
      pointIndex: 52,
      lat: 37.8280,
      lng: -122.5150,
      alertType: 'construction',
      alertMessage: 'Repaving work ahead. Shared lane with pilot car.'
    },
    {
      id: 'i-5',
      maneuver: 'slight_right',
      instruction: 'Bear right through illuminated bike tunnel',
      streetName: 'Baker-Barry Bicycle Tunnel',
      distanceToTurn: 3400,
      pointIndex: 72,
      lat: 37.8500,
      lng: -122.5050
    },
    {
      id: 'i-6',
      maneuver: 'arrive',
      instruction: 'Arrived at Sausalito Marina Waterfront',
      streetName: 'Bridgeway Cycleway',
      distanceToTurn: 2100,
      pointIndex: marinPoints.length - 1,
      lat: 37.8590,
      lng: -122.4855
    }
  ],
  hazards: [
    {
      id: 'hz-1',
      type: 'steep_climb',
      title: 'Hawk Hill Alpine Grade (11.2%)',
      description: 'Sustained steep climb for 1.6 km. Max gradient 12.1%.',
      lat: 37.8260,
      lng: -122.4995,
      gradient: 11.2,
      severity: 'warning'
    },
    {
      id: 'hz-2',
      type: 'construction',
      title: 'Trail Resurfacing & Gravel Works',
      description: 'Pavement gravel patches between mi 6.2 and 7.1. Ride centered in bike lane.',
      lat: 37.8280,
      lng: -122.5150,
      severity: 'warning'
    }
  ],
  weatherForecast: [
    {
      dayNumber: 1,
      segmentTitle: 'San Francisco to Sausalito Ridge',
      tempC: 17,
      tempF: 63,
      conditions: 'Partly Sunny, Crisp Breeze',
      icon: 'sun',
      windSpeedKmh: 14,
      windDirection: 'Headwind WNW 14 km/h',
      precipitationChance: 5
    }
  ]
};

// Route 2: Multi-day California Pacific Coast & Redwood Divide (3 Days)
const multidayWaypoints = [
  // Day 1: SF to Point Reyes (Olema)
  { lat: 37.8015, lng: -122.4650, ele: 15, grade: 0.5, surface: 'protected_cycleway', isBikeLane: true },
  { lat: 37.8590, lng: -122.4855, ele: 8, grade: 0.2, surface: 'protected_cycleway', isBikeLane: true },
  { lat: 37.9500, lng: -122.5500, ele: 32, grade: 1.5, surface: 'paved_bike_path', isBikeLane: true },
  { lat: 38.0410, lng: -122.7880, ele: 45, grade: 2.1, surface: 'paved_bike_path', isBikeLane: true },
  // Day 2: Olema to Sonoma Redwoods & Russian River
  { lat: 38.1200, lng: -122.8400, ele: 120, grade: 6.4, surface: 'road_shoulder', isBikeLane: true },
  { lat: 38.2200, lng: -122.9200, ele: 260, grade: 9.2, surface: 'paved_bike_path', isBikeLane: true },
  { lat: 38.3000, lng: -122.9800, ele: 85, grade: -4.5, surface: 'paved_bike_path', isBikeLane: true },
  // Day 3: Russian River to Bodega Bay Pacific Headlands
  { lat: 38.3800, lng: -123.0600, ele: 145, grade: 5.8, surface: 'paved_bike_path', isBikeLane: true },
  { lat: 38.3500, lng: -123.0550, ele: 195, grade: 8.5, surface: 'road_shoulder', isBikeLane: false },
  { lat: 38.3330, lng: -123.0480, ele: 12, grade: -5.2, surface: 'protected_cycleway', isBikeLane: true }
];

const multidayPoints = createSmoothRoute(multidayWaypoints, 12);

export const ROUTE_MULTIDAY_PACIFIC: CyclingRoute = {
  id: 'route-multiday-pacific',
  name: 'Pacific Coast & Redwood Divide Tour (3 Days)',
  description: 'Complete multi-day bikepacking expedition with curated campsite stopovers, segment weather forecasting, and coastal elevation tracking.',
  difficulty: 'epic',
  totalDistanceKm: 164.2,
  totalElevationGainM: 1980,
  maxElevationM: 310,
  points: multidayPoints,
  isMultiDay: true,
  stagesCount: 3,
  waypoints: [
    { id: 'md-1', name: 'Stage 1 Start: Marina Gate', lat: 37.8015, lng: -122.4650, dayNumber: 1 },
    { id: 'md-2', name: 'Stopover 1: Olema Campground & Bakery', lat: 38.0410, lng: -122.7880, isStopover: true, stopoverType: 'camp', notes: 'Campground with bike lockers, warm showers and grocery', dayNumber: 1 },
    { id: 'md-3', name: 'Stage 2 Climb: Bohemia Mountain Pass', lat: 38.2200, lng: -122.9200, isStopover: false, stopoverType: 'viewpoint', notes: 'Summit at 260m elevation', dayNumber: 2 },
    { id: 'md-4', name: 'Stopover 2: Russian River Redwood Lodge', lat: 38.3000, lng: -122.9800, isStopover: true, stopoverType: 'hotel', notes: 'Boutique eco-lodge with secure bike garage', dayNumber: 2 },
    { id: 'md-5', name: 'Stage 3 Finish: Bodega Bay Coast Velo', lat: 38.3330, lng: -123.0480, isStopover: true, stopoverType: 'cafe', notes: 'Oceanfront finish line', dayNumber: 3 }
  ],
  instructions: [
    {
      id: 'mi-1',
      maneuver: 'depart',
      instruction: 'Day 1: Depart North across Golden Gate Bike Corridor',
      streetName: 'GGB Coastal Bikeway',
      distanceToTurn: 0,
      pointIndex: 0,
      lat: 37.8015,
      lng: -122.4650
    },
    {
      id: 'mi-2',
      maneuver: 'straight',
      instruction: 'Follow Mill Valley-Sausalito Multi-use Pathway',
      streetName: 'Mill Valley Multi-Use Path',
      distanceToTurn: 8500,
      pointIndex: 18,
      lat: 37.8590,
      lng: -122.4855
    },
    {
      id: 'mi-3',
      maneuver: 'slight_left',
      instruction: 'Arrive at Day 1 Stopover: Olema Campgrounds',
      streetName: 'Point Reyes Olema Hub',
      distanceToTurn: 38000,
      pointIndex: 38,
      lat: 38.0410,
      lng: -122.7880
    },
    {
      id: 'mi-4',
      maneuver: 'sharp_right',
      instruction: 'Day 2 Climb: Steep switchbacks on Bohemian Highway (9.2%)',
      streetName: 'Bohemian Mountain Pass',
      distanceToTurn: 22000,
      pointIndex: 58,
      lat: 38.2200,
      lng: -122.9200,
      alertType: 'steep_climb',
      alertMessage: 'Steep 9.2% grade for 2.2 km through redwood ridge'
    },
    {
      id: 'mi-5',
      maneuver: 'left',
      instruction: 'Severe Weather Alert: Pacific Gale warning active. Keep firm grip on drop bars.',
      streetName: 'Highway 1 Coastal Bluffs',
      distanceToTurn: 32000,
      pointIndex: 82,
      lat: 38.3500,
      lng: -123.0550,
      alertType: 'caution',
      alertMessage: 'Severe crosswind alert: gusts up to 48 km/h'
    },
    {
      id: 'mi-6',
      maneuver: 'arrive',
      instruction: 'Grand Tour Finish: Arrived at Bodega Bay Headlands!',
      streetName: 'Bodega Bay Harbor Trail',
      distanceToTurn: 12000,
      pointIndex: multidayPoints.length - 1,
      lat: 38.3330,
      lng: -123.0480
    }
  ],
  hazards: [
    {
      id: 'mhz-1',
      type: 'severe_weather',
      title: 'High Coastal Crosswind Warning',
      description: 'Wind gusts exceeding 45 km/h along Stage 3 coastal cliffs. Deep section wheels not recommended.',
      lat: 38.3500,
      lng: -123.0550,
      severity: 'danger'
    },
    {
      id: 'mhz-2',
      type: 'steep_climb',
      title: 'Bohemia Mountain Pass (9.2% grade)',
      description: 'Steep serpentine ascent through second-growth redwoods.',
      lat: 38.2200,
      lng: -122.9200,
      gradient: 9.2,
      severity: 'warning'
    }
  ],
  weatherForecast: [
    {
      dayNumber: 1,
      segmentTitle: 'Stage 1: SF Marina to Olema Valley (51 km)',
      tempC: 18,
      tempF: 64,
      conditions: 'Sunny & Pleasant',
      icon: 'sun',
      windSpeedKmh: 12,
      windDirection: 'Tailwind SSW 12 km/h',
      precipitationChance: 0
    },
    {
      dayNumber: 2,
      segmentTitle: 'Stage 2: Olema to Russian River Redwoods (58 km)',
      tempC: 21,
      tempF: 70,
      conditions: 'Partly Cloudy, Forest Canopy Shade',
      icon: 'cloud',
      windSpeedKmh: 9,
      windDirection: 'Calm Breeze NW 9 km/h',
      precipitationChance: 10
    },
    {
      dayNumber: 3,
      segmentTitle: 'Stage 3: Russian River to Bodega Bay Bluffs (55 km)',
      tempC: 15,
      tempF: 59,
      conditions: 'High Wind Warning & Coastal Mist',
      icon: 'wind',
      windSpeedKmh: 42,
      windDirection: 'Crosswind WNW 42 km/h',
      precipitationChance: 35,
      severeAlert: 'Severe Wind Advisory: Gusts up to 48 km/h on unprotected ridges.'
    }
  ]
};

// Route 3: Flat Urban River Greenway (100% Protected Cycleway)
const urbanWaypoints = [
  { lat: 37.7749, lng: -122.4194, ele: 16, grade: 0.1, surface: 'protected_cycleway', isBikeLane: true },
  { lat: 37.7850, lng: -122.3950, ele: 8, grade: -0.2, surface: 'protected_cycleway', isBikeLane: true },
  { lat: 37.8050, lng: -122.4050, ele: 5, grade: 0.0, surface: 'protected_cycleway', isBikeLane: true },
  { lat: 37.8100, lng: -122.4200, ele: 12, grade: 0.8, surface: 'paved_bike_path', isBikeLane: true }
];

const urbanPoints = createSmoothRoute(urbanWaypoints, 10);

export const ROUTE_URBAN_GREENWAY: CyclingRoute = {
  id: 'route-urban-greenway',
  name: 'Embarcadero Waterfront Greenway',
  description: 'Completely separated two-way bike superhighway. Zero hills, optimal for fast commuting and recovery spins.',
  difficulty: 'easy',
  totalDistanceKm: 12.4,
  totalElevationGainM: 38,
  maxElevationM: 18,
  points: urbanPoints,
  isMultiDay: false,
  waypoints: [
    { id: 'uw-1', name: 'Market St Velo Station', lat: 37.7749, lng: -122.4194 },
    { id: 'uw-2', name: 'Ferry Building Cycleway', lat: 37.7955, lng: -122.3937, stopoverType: 'cafe' },
    { id: 'uw-3', name: 'Fishermans Wharf Pier Bike Hub', lat: 37.8100, lng: -122.4200 }
  ],
  instructions: [
    {
      id: 'ui-1',
      maneuver: 'depart',
      instruction: 'Depart on protected bidirectional cycleway',
      streetName: 'Market St Bike Lane',
      distanceToTurn: 0,
      pointIndex: 0,
      lat: 37.7749,
      lng: -122.4194
    },
    {
      id: 'ui-2',
      maneuver: 'slight_right',
      instruction: 'Continue along wide Waterfront Promenade',
      streetName: 'The Embarcadero Protected Bikeway',
      distanceToTurn: 2400,
      pointIndex: 12,
      lat: 37.7850,
      lng: -122.3950
    },
    {
      id: 'ui-3',
      maneuver: 'arrive',
      instruction: 'Arrived at Pier Plaza Cycle Park',
      streetName: 'Pier 39 Cycle Hub',
      distanceToTurn: 3100,
      pointIndex: urbanPoints.length - 1,
      lat: 37.8100,
      lng: -122.4200
    }
  ],
  hazards: [],
  weatherForecast: [
    {
      dayNumber: 1,
      segmentTitle: 'Urban Waterfront Span',
      tempC: 19,
      tempF: 66,
      conditions: 'Sunny & Mild',
      icon: 'sun',
      windSpeedKmh: 8,
      windDirection: 'Calm 8 km/h',
      precipitationChance: 0
    }
  ]
};

export const ALL_PRESET_ROUTES: CyclingRoute[] = [
  ROUTE_MARIN_HEADLANDS,
  ROUTE_MULTIDAY_PACIFIC,
  ROUTE_URBAN_GREENWAY
];
