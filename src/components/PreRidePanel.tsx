import React, { useState } from 'react';
import { CyclingRoute } from '../types/cycling';
import { ALL_PRESET_ROUTES } from '../data/sampleRoutes';
import { AddressAutoSuggestInput } from './AddressAutoSuggestInput';
import { CyclingPlace } from '../data/cyclingPlaces';
import { GeocodedAddress } from '../services/geocodingService';
import { fetchRealBicycleRoute } from '../services/routingService';
import { fetchLiveWeather } from '../services/weatherService';
import { 
  Play, 
  ArrowUpDown, 
  Route as RouteIcon, 
  Sliders, 
  Navigation,
  Radio,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { formatDuration } from '../utils/cyclingEstimator';

interface PreRidePanelProps {
  route: CyclingRoute;
  preferredSpeedKmh: number;
  isSunlightMode: boolean;
  isRealGPSMode: boolean;
  onToggleRealGPS: (enabled: boolean) => void;
  onSelectRoute: (route: CyclingRoute) => void;
  onStartRide: () => void;
  onOpenRoutePlanner: () => void;
}

export const PreRidePanel: React.FC<PreRidePanelProps> = ({
  route,
  preferredSpeedKmh,
  isSunlightMode,
  isRealGPSMode,
  onToggleRealGPS,
  onSelectRoute,
  onStartRide,
  onOpenRoutePlanner
}) => {
  const [pointA, setPointA] = useState<string>(
    route.waypoints[0]?.name || 'Presidio Bike Hub'
  );
  const [pointB, setPointB] = useState<string>(
    route.waypoints[route.waypoints.length - 1]?.name || 'Sausalito Marina Cafe'
  );

  const [coordsA, setCoordsA] = useState<{ lat: number; lng: number; name: string }>({
    lat: route.waypoints[0]?.lat || 37.8015,
    lng: route.waypoints[0]?.lng || -122.4650,
    name: route.waypoints[0]?.name || 'Point A'
  });

  const [coordsB, setCoordsB] = useState<{ lat: number; lng: number; name: string }>({
    lat: route.waypoints[route.waypoints.length - 1]?.lat || 37.8590,
    lng: route.waypoints[route.waypoints.length - 1]?.lng || -122.4855,
    name: route.waypoints[route.waypoints.length - 1]?.name || 'Point B'
  });

  const [isRoutingLive, setIsRoutingLive] = useState<boolean>(false);
  const [liveRoutingSuccess, setLiveRoutingSuccess] = useState<boolean>(false);

  // Calculate estimated duration at preferred speed
  const estHours = route.totalDistanceKm / Math.max(10, preferredSpeedKmh);
  const estMinutes = Math.round(estHours * 60);

  // Swap Point A and B
  const handleSwap = () => {
    const tempName = pointA;
    const tempCoords = coordsA;
    setPointA(pointB);
    setCoordsA(coordsB);
    setPointB(tempName);
    setCoordsB(tempCoords);
    triggerLiveRouteCalc(coordsB, tempCoords);
  };

  // Helper to trigger live routing calculation
  const triggerLiveRouteCalc = async (
    start: { lat: number; lng: number; name: string },
    end: { lat: number; lng: number; name: string }
  ) => {
    setIsRoutingLive(true);
    setLiveRoutingSuccess(false);

    try {
      const realRoute = await fetchRealBicycleRoute(start, end);
      if (realRoute && realRoute.points.length > 0) {
        // Fetch live weather at midpoint
        const midPt = realRoute.points[Math.floor(realRoute.points.length / 2)];
        const liveWeather = await fetchLiveWeather(midPt.lat, midPt.lng, `${start.name} to ${end.name}`);
        if (liveWeather) {
          realRoute.weatherForecast = [liveWeather];
        }

        onSelectRoute(realRoute);
        setLiveRoutingSuccess(true);
        setTimeout(() => setLiveRoutingSuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Could not compute live route, keeping preset:', err);
    } finally {
      setIsRoutingLive(false);
    }
  };

  // When a user selects a place from auto-suggest
  const handleSelectPlaceA = (place: CyclingPlace | GeocodedAddress) => {
    setPointA(place.name);
    const newCoordsA = { lat: place.lat, lng: place.lng, name: place.name };
    setCoordsA(newCoordsA);

    if ((place as CyclingPlace).routeIdMatch) {
      const match = ALL_PRESET_ROUTES.find(r => r.id === (place as CyclingPlace).routeIdMatch);
      if (match) {
        onSelectRoute(match);
        setPointB(match.waypoints[match.waypoints.length - 1]?.name || 'Destination');
        return;
      }
    }

    triggerLiveRouteCalc(newCoordsA, coordsB);
  };

  const handleSelectPlaceB = (place: CyclingPlace | GeocodedAddress) => {
    setPointB(place.name);
    const newCoordsB = { lat: place.lat, lng: place.lng, name: place.name };
    setCoordsB(newCoordsB);

    if ((place as CyclingPlace).routeIdMatch) {
      const match = ALL_PRESET_ROUTES.find(r => r.id === (place as CyclingPlace).routeIdMatch);
      if (match) {
        onSelectRoute(match);
        setPointA(match.waypoints[0]?.name || 'Origin');
        return;
      }
    }

    triggerLiveRouteCalc(coordsA, newCoordsB);
  };

  return (
    <div className="absolute top-16 left-3 right-3 z-[1000] max-w-xl mx-auto pointer-events-none">
      <div className={`pointer-events-auto rounded-3xl shadow-2xl border transition-all duration-300 overflow-visible ${
        isSunlightMode
          ? 'bg-white/95 border-amber-300 text-zinc-950 ring-2 ring-black/10 backdrop-blur-xl'
          : 'bg-zinc-950/95 border-zinc-800 text-white backdrop-blur-2xl ring-1 ring-white/10'
      }`}>
        {/* Header Ribbon with Mode Indicators */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-500/10 border-b border-inherit rounded-t-3xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
              {isRoutingLive ? 'Calculating Live Route...' : 'Live Route • Bike Lanes Prioritized'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {liveRoutingSuccess && (
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" /> Live OSM Route
              </span>
            )}
            <span className="text-[11px] font-mono text-zinc-400 font-semibold">
              {preferredSpeedKmh} km/h pace
            </span>
          </div>
        </div>

        {/* POINT A & POINT B AUTO-SUGGEST INPUTS */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            {/* Visual Route Connector Line */}
            <div className="flex flex-col items-center flex-shrink-0 self-stretch py-2">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
              </div>
              <div className="w-0.5 flex-1 bg-gradient-to-b from-emerald-500 to-rose-500 my-1"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white shadow-sm flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            </div>

            {/* Inputs Container */}
            <div className="flex-1 space-y-2">
              {/* Point A Auto-Suggest */}
              <AddressAutoSuggestInput
                label="Point A (Origin)"
                value={pointA}
                onChange={setPointA}
                onSelectPlace={handleSelectPlaceA}
                placeholder="Search worldwide address, trailhead, or cycleway..."
                isOrigin={true}
                isSunlightMode={isSunlightMode}
                onUseCurrentLocation={() => {
                  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const myCoords = {
                          lat: pos.coords.latitude,
                          lng: pos.coords.longitude,
                          name: 'My Current Location (GPS)'
                        };
                        setPointA(myCoords.name);
                        setCoordsA(myCoords);
                        triggerLiveRouteCalc(myCoords, coordsB);
                      },
                      () => {
                        setPointA('Presidio Bike Hub (Current GPS)');
                      }
                    );
                  }
                }}
              />

              {/* Point B Auto-Suggest */}
              <AddressAutoSuggestInput
                label="Point B (Destination)"
                value={pointB}
                onChange={setPointB}
                onSelectPlace={handleSelectPlaceB}
                placeholder="Search destination, summit, street or cafe..."
                isOrigin={false}
                isSunlightMode={isSunlightMode}
              />
            </div>

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              disabled={isRoutingLive}
              className="p-2.5 rounded-2xl border border-inherit hover:bg-white/10 active:scale-95 transition flex-shrink-0 text-zinc-400 hover:text-white self-center mt-3 cursor-pointer"
              title="Swap Point A and Point B"
              aria-label="Swap starting point and destination"
            >
              {isRoutingLive ? (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              ) : (
                <ArrowUpDown className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Quick Preset Cycling Routes Selection Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
            {ALL_PRESET_ROUTES.map(r => {
              const isSelected = r.id === route.id;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    onSelectRoute(r);
                    setPointA(r.waypoints[0]?.name || 'Origin');
                    setPointB(r.waypoints[r.waypoints.length - 1]?.name || 'Destination');
                    setCoordsA({ lat: r.waypoints[0]?.lat || 37.8, lng: r.waypoints[0]?.lng || -122.4, name: r.waypoints[0]?.name || 'Origin' });
                    setCoordsB({ lat: r.waypoints[r.waypoints.length - 1]?.lat || 37.85, lng: r.waypoints[r.waypoints.length - 1]?.lng || -122.48, name: r.waypoints[r.waypoints.length - 1]?.name || 'Destination' });
                  }}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition text-xs flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                      : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  <RouteIcon className="w-3.5 h-3.5" />
                  <span>{r.name.split('&')[0].trim()}</span>
                </button>
              );
            })}
          </div>

          {/* Route Stats Summary Strip */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-zinc-900/60 border border-inherit text-center text-xs">
            <div>
              <span className="text-[10px] font-bold opacity-60 block">DISTANCE</span>
              <span className="text-sm font-black font-mono text-zinc-100">{route.totalDistanceKm} km</span>
            </div>
            <div>
              <span className="text-[10px] font-bold opacity-60 block">ELEVATION</span>
              <span className="text-sm font-black font-mono text-emerald-400">+{route.totalElevationGainM} m</span>
            </div>
            <div>
              <span className="text-[10px] font-bold opacity-60 block">EST. TIME</span>
              <span className="text-sm font-black font-mono text-sky-400">{formatDuration(estMinutes)}</span>
            </div>
          </div>

          {/* GPS Tracking Mode Selector */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <Radio className={`w-4 h-4 ${isRealGPSMode ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
              <div>
                <span className="font-bold text-zinc-200">
                  {isRealGPSMode ? 'Real Device GPS Mode' : 'Virtual Ride Simulation'}
                </span>
                <span className="block text-[10px] text-zinc-400">
                  {isRealGPSMode ? 'Tracking live speed & location outdoors' : 'Replay route in test simulator'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleRealGPS(!isRealGPSMode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                isRealGPSMode 
                  ? 'bg-emerald-500 text-black' 
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {isRealGPSMode ? 'GPS Live' : 'Use Live GPS'}
            </button>
          </div>

          {/* ACTION BUTTONS: START RIDE OR ROUTE PLANNER */}
          <div className="flex items-center gap-2.5 pt-1">
            {/* Start Ride Button */}
            <button
              onClick={onStartRide}
              disabled={isRoutingLive}
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 active:scale-98 transition cursor-pointer disabled:opacity-50"
              aria-label="Start ride navigation"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{isRealGPSMode ? 'START LIVE RIDE' : 'START RIDE'}</span>
            </button>

            {/* Route Planner Button */}
            <button
              onClick={onOpenRoutePlanner}
              className="py-3 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 font-bold text-xs sm:text-sm flex items-center gap-2 active:scale-98 transition cursor-pointer"
              aria-label="Open route planner to adjust segments and speed"
            >
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Route Planner</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
