export type SurfaceType = 'paved_bike_path' | 'protected_cycleway' | 'road_shoulder' | 'gravel' | 'unpaved';

export type TurnManeuver = 
  | 'depart'
  | 'straight'
  | 'slight_right'
  | 'right'
  | 'sharp_right'
  | 'slight_left'
  | 'left'
  | 'sharp_left'
  | 'u_turn'
  | 'arrive';

export interface LatLng {
  lat: number;
  lng: number;
  ele?: number; // Elevation in meters
}

export interface RoutePoint extends LatLng {
  distanceFromStart: number; // in meters
  grade: number; // percentage grade e.g. 8.5 for 8.5%
  surface: SurfaceType;
  isBikeLane: boolean;
}

export interface TurnInstruction {
  id: string;
  maneuver: TurnManeuver;
  instruction: string;
  streetName: string;
  distanceToTurn: number; // distance from previous point or from start
  pointIndex: number;
  lat: number;
  lng: number;
  alertType?: 'steep_climb' | 'construction' | 'gravel' | 'caution';
  alertMessage?: string;
}

export type HazardType = 'steep_climb' | 'construction' | 'rough_surface' | 'severe_weather' | 'closure';

export interface HazardAlert {
  id: string;
  type: HazardType;
  title: string;
  description: string;
  lat: number;
  lng: number;
  gradient?: number;
  distanceFromCurrentKm?: number;
  severity: 'info' | 'warning' | 'danger';
}

export type POIType = 'bike_shop' | 'repair_station' | 'bike_pump' | 'water_refill' | 'emergency_aid';

export interface BikePOI {
  id: string;
  name: string;
  type: POIType;
  lat: number;
  lng: number;
  address?: string;
  isOpen?: boolean;
  hasTools?: boolean;
  hasPump?: boolean;
  phone?: string;
  distanceMeters?: number;
}

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isStopover?: boolean; // overnight or long rest
  stopoverType?: 'hotel' | 'camp' | 'cafe' | 'viewpoint';
  notes?: string;
  dayNumber?: number;
}

export interface SegmentWeather {
  dayNumber: number;
  segmentTitle: string;
  tempC: number;
  tempF: number;
  conditions: string;
  icon: 'sun' | 'rain' | 'cloud' | 'wind' | 'storm';
  windSpeedKmh: number;
  windDirection: string; // e.g. "Tailwind WNW 15km/h"
  precipitationChance: number;
  severeAlert?: string;
}

export type FitnessLevel = 'casual' | 'commuter' | 'enthusiast' | 'pro' | 'ebike';

export interface CyclingStats {
  currentSpeed: number; // km/h
  averageSpeed: number; // km/h
  maxSpeed: number; // km/h
  currentAltitude: number; // m
  maxAltitude: number; // m
  totalElevationGain: number; // m
  currentGrade: number; // %
  distanceCoveredKm: number; // km
  distanceRemainingKm: number; // km
  elapsedSeconds: number;
  estimatedRemainingMinutes: number;
}

export interface CyclingRoute {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'moderate' | 'challenging' | 'epic';
  totalDistanceKm: number;
  totalElevationGainM: number;
  maxElevationM: number;
  points: RoutePoint[];
  instructions: TurnInstruction[];
  waypoints: Waypoint[];
  hazards: HazardAlert[];
  isMultiDay: boolean;
  stagesCount?: number;
  weatherForecast?: SegmentWeather[];
}
