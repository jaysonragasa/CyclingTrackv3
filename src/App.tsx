import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CyclingRoute, 
  RoutePoint, 
  TurnInstruction, 
  CyclingStats, 
  FitnessLevel, 
  BikePOI, 
  Waypoint, 
  HazardAlert 
} from './types/cycling';
import { 
  ALL_PRESET_ROUTES, 
  ROUTE_MARIN_HEADLANDS, 
  SAMPLE_POIS 
} from './data/sampleRoutes';
import { Map, MapTileTheme } from './components/Map';
import { CyclingHUD } from './components/CyclingHUD';
import { PreRidePanel } from './components/PreRidePanel';
import { ElevationProfile } from './components/ElevationProfile';
import { TripPlannerModal } from './components/TripPlannerModal';
import { NearbyPOIsDrawer } from './components/NearbyPOIsDrawer';
import { OfflineManagerModal } from './components/OfflineManagerModal';
import { GPXModal } from './components/GPXModal';
import { NavigationFeedbackController } from './utils/hapticsAndAudio';
import { GPSTrackerService } from './services/gpsTracker';
import { 
  calculateDistanceMeters, 
  calculateBearing, 
  getNearbyPOIsWithDistance,
  findNearestPointIndex
} from './utils/geo';
import { 
  estimatePointSpeed, 
  estimateTripDurationMinutes, 
  FITNESS_PROFILES 
} from './utils/cyclingEstimator';
import { 
  Bike, 
  Calendar, 
  Layers, 
  Wrench, 
  HardDrive, 
  FileCode, 
  AlertTriangle, 
  Check, 
  Volume2, 
  Menu, 
  X,
  ChevronDown
} from 'lucide-react';

export default function App() {
  // Active Route & Routing Preferences
  const [activeRoute, setActiveRoute] = useState<CyclingRoute>(ROUTE_MARIN_HEADLANDS);
  const [routePreference, setRoutePreference] = useState<'bike_lanes' | 'flat' | 'scenic'>('bike_lanes');

  // Pre-Ride / Active Navigation State
  const [hasRideStarted, setHasRideStarted] = useState<boolean>(false);
  const [preferredSpeedKmh, setPreferredSpeedKmh] = useState<number>(24);
  const [isRealGPSMode, setIsRealGPSMode] = useState<boolean>(false);

  // Navigation & Simulation State
  const [currentPointIndex, setCurrentPointIndex] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [currentBearing, setCurrentBearing] = useState<number>(0);
  const [isHeadingUp, setIsHeadingUp] = useState<boolean>(true); // Auto-rotate map to travel direction

  // Display & Environmental Modes
  const [isSunlightMode, setIsSunlightMode] = useState<boolean>(false);
  const [tileTheme, setTileTheme] = useState<MapTileTheme>('cyclosm');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isHapticsEnabled, setIsHapticsEnabled] = useState<boolean>(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [showElevationProfile, setShowElevationProfile] = useState<boolean>(false);
  const [showPOIsOnMap, setShowPOIsOnMap] = useState<boolean>(true);
  const [hudMode, setHudMode] = useState<'compact' | 'full' | 'hidden'>('compact');

  // Modals & Drawers
  const [isTripPlannerOpen, setIsTripPlannerOpen] = useState<boolean>(false);
  const [isNearbyDrawerOpen, setIsNearbyDrawerOpen] = useState<boolean>(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);
  const [isGPXModalOpen, setIsGPXModalOpen] = useState<boolean>(false);
  const [isRouteSelectorOpen, setIsRouteSelectorOpen] = useState<boolean>(false);

  // Rider Profile & Fitness
  const [fitness, setFitness] = useState<FitnessLevel>('enthusiast');

  // Cycling Performance Stats
  const [stats, setStats] = useState<CyclingStats>({
    currentSpeed: 24.5,
    averageSpeed: 23.2,
    maxSpeed: 42.8,
    currentAltitude: 15,
    maxAltitude: 284,
    totalElevationGain: 0,
    currentGrade: 0.5,
    distanceCoveredKm: 0,
    distanceRemainingKm: ROUTE_MARIN_HEADLANDS.totalDistanceKm,
    elapsedSeconds: 0,
    estimatedRemainingMinutes: 65
  });

  // Active Hazard Banner alert if cyclist is within 400m of one
  const [activeHazard, setActiveHazard] = useState<HazardAlert | null>(null);

  // History for stats calculation
  const speedHistoryRef = useRef<number[]>([24]);
  const maxSpeedRef = useRef<number>(24);
  const lastAlertSpokenRef = useRef<string>('');

  const currentPoint = activeRoute.points[currentPointIndex] || activeRoute.points[0];

  // Sync sunlight mode with map theme if needed
  useEffect(() => {
    if (isSunlightMode) {
      setTileTheme('sunlight');
    }
  }, [isSunlightMode]);

  useEffect(() => {
    const onUserTouch = () => {
      NavigationFeedbackController.markUserInteracted();
    };
    window.addEventListener('click', onUserTouch, { once: true });
    window.addEventListener('touchstart', onUserTouch, { once: true });
    return () => {
      window.removeEventListener('click', onUserTouch);
      window.removeEventListener('touchstart', onUserTouch);
    };
  }, []);

  // Compute nearby POIs based on current cyclist position
  const nearbyPOIs = useMemo(() => {
    if (!currentPoint) return SAMPLE_POIS;
    return getNearbyPOIsWithDistance(SAMPLE_POIS, { lat: currentPoint.lat, lng: currentPoint.lng });
  }, [currentPoint]);

  // Find next upcoming turn instruction
  const currentInstruction: TurnInstruction | undefined = useMemo(() => {
    const instructions = activeRoute.instructions;
    if (!instructions.length) return undefined;

    // Find the next instruction at or ahead of current point
    for (const inst of instructions) {
      if (inst.pointIndex >= currentPointIndex) {
        const ptAtTurn = activeRoute.points[inst.pointIndex];
        const distToTurn = ptAtTurn && currentPoint
          ? calculateDistanceMeters(currentPoint, ptAtTurn)
          : inst.distanceToTurn;

        return {
          ...inst,
          distanceToTurn: Math.max(10, Math.round(distToTurn))
        };
      }
    }
    return instructions[instructions.length - 1];
  }, [activeRoute, currentPointIndex, currentPoint]);

  // Turn cue and hazard notifications (voice & haptic)
  useEffect(() => {
    if (!currentInstruction) return;

    // Turn soon announcement
    if (currentInstruction.distanceToTurn <= 120 && currentInstruction.distanceToTurn > 60) {
      const cue = `In 100 meters, ${currentInstruction.instruction}`;
      if (lastAlertSpokenRef.current !== cue) {
        lastAlertSpokenRef.current = cue;
        NavigationFeedbackController.speak(cue);
        NavigationFeedbackController.triggerHaptic('turn_soon');
      }
    } else if (currentInstruction.distanceToTurn <= 30) {
      const cue = `${currentInstruction.instruction} onto ${currentInstruction.streetName}`;
      if (lastAlertSpokenRef.current !== cue) {
        lastAlertSpokenRef.current = cue;
        NavigationFeedbackController.speak(cue);
        NavigationFeedbackController.triggerHaptic('turn_now');
      }
    }

    // Check steep climb or construction hazard alerts near current location
    const nearestHazard = activeRoute.hazards.find(h => {
      const dist = calculateDistanceMeters(currentPoint, { lat: h.lat, lng: h.lng });
      return dist <= 350; // Within 350m
    });

    if (nearestHazard) {
      setActiveHazard(nearestHazard);
      const hazardCue = nearestHazard.type === 'steep_climb'
        ? `Warning: Steep climb ahead, ${nearestHazard.gradient || 9} percent grade. Shift down.`
        : `Caution: ${nearestHazard.title}`;

      if (lastAlertSpokenRef.current !== hazardCue) {
        lastAlertSpokenRef.current = hazardCue;
        NavigationFeedbackController.speak(hazardCue, 'urgent');
        NavigationFeedbackController.triggerHaptic(nearestHazard.type === 'steep_climb' ? 'steep_climb' : 'hazard');
      }
    } else {
      setActiveHazard(null);
    }
  }, [currentInstruction, currentPoint, activeRoute.hazards]);

  // Navigation Simulation Loop
  useEffect(() => {
    if (!isSimulating) return;

    const intervalMs = Math.max(150, Math.round(800 / simulationSpeed));
    const timer = setInterval(() => {
      setCurrentPointIndex((prevIdx) => {
        if (prevIdx >= activeRoute.points.length - 1) {
          setIsSimulating(false);
          NavigationFeedbackController.speak('Ride finished! Great job.');
          NavigationFeedbackController.triggerHaptic('waypoint');
          return prevIdx;
        }

        const nextIdx = prevIdx + 1;
        const pt1 = activeRoute.points[prevIdx];
        const pt2 = activeRoute.points[nextIdx];

        // Calculate travel heading / bearing
        const bearing = calculateBearing(pt1, pt2);
        setCurrentBearing(bearing);

        // Calculate dynamic speed based on gradient, surface & cyclist fitness
        const speed = estimatePointSpeed(pt2.grade, pt2.surface, fitness);
        speedHistoryRef.current.push(speed);
        if (speed > maxSpeedRef.current) maxSpeedRef.current = speed;

        const avgSpeed = speedHistoryRef.current.reduce((a, b) => a + b, 0) / speedHistoryRef.current.length;
        const coveredKm = pt2.distanceFromStart / 1000;
        const remainingKm = Math.max(0, (activeRoute.totalDistanceKm * 1000 - pt2.distanceFromStart) / 1000);
        const estMinutes = avgSpeed > 0 ? Math.round((remainingKm / avgSpeed) * 60) : 0;

        setStats(prev => ({
          ...prev,
          currentSpeed: speed,
          averageSpeed: Math.round(avgSpeed * 10) / 10,
          maxSpeed: Math.round(maxSpeedRef.current * 10) / 10,
          currentAltitude: pt2.ele ?? prev.currentAltitude,
          currentGrade: pt2.grade,
          distanceCoveredKm: Math.round(coveredKm * 10) / 10,
          distanceRemainingKm: Math.round(remainingKm * 10) / 10,
          totalElevationGain: Math.min(activeRoute.totalElevationGainM, Math.round(pt2.distanceFromStart / 45)),
          elapsedSeconds: prev.elapsedSeconds + (intervalMs / 1000),
          estimatedRemainingMinutes: estMinutes
        }));

        return nextIdx;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isSimulating, simulationSpeed, activeRoute, fitness]);

  // Real GPS Device Tracking (Active outdoors on real bike)
  useEffect(() => {
    if (!hasRideStarted || !isRealGPSMode) {
      GPSTrackerService.stopTracking();
      return;
    }

    const trackingActive = GPSTrackerService.startTracking((update) => {
      // Find nearest point on route from real GPS coordinates
      const nearestIdx = findNearestPointIndex(activeRoute.points, update.coords);
      setCurrentPointIndex(nearestIdx);
      if (update.headingDeg !== undefined) {
        setCurrentBearing(update.headingDeg);
      }

      setStats(prev => ({
        ...prev,
        currentSpeed: update.speedKmh,
        averageSpeed: update.speedKmh > 0 ? Math.round(((prev.averageSpeed + update.speedKmh) / 2) * 10) / 10 : prev.averageSpeed,
        maxSpeed: Math.max(prev.maxSpeed, update.speedKmh),
        currentAltitude: update.altitudeM ?? prev.currentAltitude,
        distanceRemainingKm: Math.max(0, (activeRoute.totalDistanceKm * 1000 - (activeRoute.points[nearestIdx]?.distanceFromStart ?? 0)) / 1000)
      }));
    });

    if (trackingActive) {
      NavigationFeedbackController.speak('Connected to device GPS. Tracking real ride speed.');
    }

    return () => {
      GPSTrackerService.stopTracking();
    };
  }, [hasRideStarted, isRealGPSMode, activeRoute.points]);

  // Handler: Switch active route
  const handleSelectRoute = (route: CyclingRoute) => {
    setActiveRoute(route);
    setCurrentPointIndex(0);
    setIsSimulating(false);
    speedHistoryRef.current = [20];
    maxSpeedRef.current = 20;

    const est = estimateTripDurationMinutes(route.points, fitness);
    setStats({
      currentSpeed: FITNESS_PROFILES[fitness].baseFlatSpeedKmh,
      averageSpeed: est.averageSpeedKmh,
      maxSpeed: FITNESS_PROFILES[fitness].baseFlatSpeedKmh * 1.3,
      currentAltitude: route.points[0]?.ele ?? 0,
      maxAltitude: route.maxElevationM,
      totalElevationGain: 0,
      currentGrade: route.points[0]?.grade ?? 0,
      distanceCoveredKm: 0,
      distanceRemainingKm: route.totalDistanceKm,
      elapsedSeconds: 0,
      estimatedRemainingMinutes: est.totalMinutes
    });

    setIsRouteSelectorOpen(false);
    NavigationFeedbackController.speak(`Route loaded: ${route.name}`);
  };

  // Handler: Detour to a bike repair station
  const handleDetourToPOI = (poi: BikePOI) => {
    const detourPoint: RoutePoint = {
      lat: poi.lat,
      lng: poi.lng,
      ele: (currentPoint?.ele ?? 20) + 2,
      distanceFromStart: (currentPoint?.distanceFromStart ?? 0) + (poi.distanceMeters ?? 400),
      grade: 1.0,
      surface: 'protected_cycleway',
      isBikeLane: true
    };

    const updatedPoints = [
      ...activeRoute.points.slice(0, currentPointIndex + 1),
      detourPoint,
      ...activeRoute.points.slice(currentPointIndex + 1)
    ];

    const updatedInstructions: TurnInstruction[] = [
      ...activeRoute.instructions.slice(0, 1),
      {
        id: `detour-${poi.id}`,
        maneuver: 'right',
        instruction: `Detour to ${poi.name} for repairs/tools`,
        streetName: poi.address || 'Repair Station Access',
        distanceToTurn: poi.distanceMeters ?? 350,
        pointIndex: currentPointIndex + 1,
        lat: poi.lat,
        lng: poi.lng
      },
      ...activeRoute.instructions.slice(1)
    ];

    setActiveRoute(prev => ({
      ...prev,
      points: updatedPoints,
      instructions: updatedInstructions,
      waypoints: [
        ...prev.waypoints,
        {
          id: `detour-wpt-${poi.id}`,
          name: `Detour: ${poi.name}`,
          lat: poi.lat,
          lng: poi.lng,
          isStopover: true,
          stopoverType: 'cafe'
        }
      ]
    }));

    NavigationFeedbackController.speak(`Detour set to ${poi.name}`);
    NavigationFeedbackController.triggerHaptic('waypoint');
  };

  // Handler: Add custom waypoint
  const handleAddWaypointAtCoord = (lat: number, lng: number) => {
    const newWpt: Waypoint = {
      id: `map-wpt-${Date.now()}`,
      name: `Rider Marker ${activeRoute.waypoints.length + 1}`,
      lat,
      lng,
      isStopover: false
    };

    setActiveRoute(prev => ({
      ...prev,
      waypoints: [...prev.waypoints, newWpt]
    }));
    NavigationFeedbackController.triggerHaptic('click');
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden flex flex-col font-sans select-none ${
      isSunlightMode ? 'bg-amber-50 text-zinc-950' : 'bg-zinc-950 text-zinc-100'
    }`}>
      {/* APP TOP APP-BAR (HIDDEN DURING ACTIVE RIDE) */}
      {!hasRideStarted && (
        <header className={`relative z-[1050] flex items-center justify-between px-3.5 py-2.5 border-b backdrop-blur-xl transition ${
          isSunlightMode 
            ? 'bg-amber-100/95 border-amber-300 text-zinc-900' 
            : 'bg-zinc-950/90 border-zinc-800 text-zinc-100'
        }`}>
        {/* Brand & Route Selector Dropdown */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-black shadow-md shadow-emerald-500/20">
            <Bike className="w-5 h-5 stroke-[2.5]" />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsRouteSelectorOpen(!isRouteSelectorOpen)}
              className="flex items-center gap-1.5 text-left group"
              aria-expanded={isRouteSelectorOpen}
              aria-label="Select cycling route"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm tracking-tight truncate max-w-[170px] sm:max-w-xs group-hover:text-emerald-400 transition">
                    {activeRoute.name}
                  </span>
                  <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition" />
                </div>
                <span className="text-[11px] font-mono text-zinc-400 block -mt-0.5">
                  {activeRoute.totalDistanceKm} km • +{activeRoute.totalElevationGainM}m • {activeRoute.difficulty}
                </span>
              </div>
            </button>

            {/* Route Selector Dropdown Menu */}
            {isRouteSelectorOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-[1100] text-zinc-100 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                  Preset Routes & Tours
                </div>
                {ALL_PRESET_ROUTES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRoute(r)}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between ${
                      r.id === activeRoute.id
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'hover:bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{r.name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {r.totalDistanceKm} km • +{r.totalElevationGainM}m • {r.isMultiDay ? 'Multi-Day' : 'Single Ride'}
                      </div>
                    </div>
                    {r.id === activeRoute.id && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}

                <div className="border-t border-zinc-800 mt-2 pt-2 flex gap-1.5">
                  <button
                    onClick={() => {
                      setIsRouteSelectorOpen(false);
                      setIsGPXModalOpen(true);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-center text-zinc-200"
                  >
                    Import GPX
                  </button>
                  <button
                    onClick={() => {
                      setIsRouteSelectorOpen(false);
                      setIsTripPlannerOpen(true);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold text-center"
                  >
                    Tour Planner
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Tool Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {hasRideStarted && (
            <button
              onClick={() => {
                setHasRideStarted(false);
                setIsSimulating(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition active:scale-95 hover:bg-emerald-500/25"
              title="Edit Origin & Destination (Point A - Point B)"
              aria-label="Edit starting point and destination"
            >
              <span>← Edit A-B</span>
            </button>
          )}

          {/* Multi-Day Trip Planner */}
          <button
            onClick={() => setIsTripPlannerOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition active:scale-95 border border-zinc-700"
            title="Multi-Day Ride Planner & Weather"
            aria-label="Open multi-day ride planner"
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Tour Planner</span>
          </button>

          {/* Nearby Bike Repair Shops / Emergency POIs */}
          <button
            onClick={() => setIsNearbyDrawerOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition active:scale-95 border border-zinc-700"
            title="Locate nearest bike shops & repair stations"
            aria-label="Find bike repair shops and tools"
          >
            <Wrench className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Shops & Tools</span>
          </button>

          {/* Offline Maps Pack Manager */}
          <button
            onClick={() => setIsOfflineModalOpen(true)}
            className={`p-2 rounded-xl border transition active:scale-95 ${
              isOfflineMode 
                ? 'bg-amber-500 text-black border-amber-600' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
            }`}
            title="Offline Maps & Remote Mode"
            aria-label="Open offline maps manager"
          >
            <HardDrive className="w-4 h-4" />
          </button>

          {/* GPX Sync & Export */}
          <button
            onClick={() => setIsGPXModalOpen(true)}
            className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition active:scale-95"
            title="Import/Export GPX (Strava / Komoot)"
            aria-label="GPX route sync and export"
          >
            <FileCode className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </header>
      )}

      {/* MAIN VIEWPORT: INTERACTIVE AUTO-ROTATING MAP */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <Map
          route={activeRoute}
          currentPoint={currentPoint}
          currentBearing={currentBearing}
          isHeadingUp={isHeadingUp}
          tileTheme={tileTheme}
          pois={nearbyPOIs}
          showPOIs={showPOIsOnMap}
          onSelectPOI={(poi) => {
            NavigationFeedbackController.speak(`Selected ${poi.name}`);
          }}
          onAddWaypointAtCoord={handleAddWaypointAtCoord}
        />

        {/* PRE-RIDE PANEL (Point A to Point B) */}
        {!hasRideStarted ? (
          <PreRidePanel
            route={activeRoute}
            preferredSpeedKmh={preferredSpeedKmh}
            isSunlightMode={isSunlightMode}
            isRealGPSMode={isRealGPSMode}
            onToggleRealGPS={setIsRealGPSMode}
            onSelectRoute={handleSelectRoute}
            onStartRide={() => {
              setHasRideStarted(true);
              setIsSimulating(!isRealGPSMode);
              NavigationFeedbackController.speak('Starting ride navigation from Point A to Point B');
              NavigationFeedbackController.triggerHaptic('turn_soon');
            }}
            onOpenRoutePlanner={() => setIsTripPlannerOpen(true)}
          />
        ) : (
          /* ACTIVE CYCLING HUD (Glanceable top turn banner & bottom cockpit) */
          <CyclingHUD
            currentInstruction={currentInstruction}
            stats={stats}
            isSimulating={isSimulating}
            simulationSpeed={simulationSpeed}
            isSunlightMode={isSunlightMode}
            isAudioMuted={isAudioMuted}
            isHapticsEnabled={isHapticsEnabled}
            isHeadingUp={isHeadingUp}
            currentBearing={currentBearing}
            onToggleSimulate={() => {
              const next = !isSimulating;
              setIsSimulating(next);
              if (next) {
                NavigationFeedbackController.speak('Navigation resumed');
                NavigationFeedbackController.triggerHaptic('turn_soon');
              } else {
                NavigationFeedbackController.speak('Ride paused');
              }
            }}
            onResetSimulate={() => {
              setIsSimulating(false);
              setCurrentPointIndex(0);
              setCurrentBearing(0);
              NavigationFeedbackController.triggerHaptic('click');
            }}
            onChangeSimSpeed={(spd) => setSimulationSpeed(spd)}
            onToggleSunlightMode={() => {
              setIsSunlightMode(!isSunlightMode);
              NavigationFeedbackController.triggerHaptic('click');
            }}
            onToggleAudio={() => {
              const next = !isAudioMuted;
              setIsAudioMuted(next);
              NavigationFeedbackController.setMuted(next);
              if (!next) {
                NavigationFeedbackController.speak('Voice navigation enabled');
              }
            }}
            onToggleHaptics={() => {
              const next = !isHapticsEnabled;
              setIsHapticsEnabled(next);
              NavigationFeedbackController.setHaptics(next);
              if (next) {
                NavigationFeedbackController.triggerHaptic('turn_now');
              }
            }}
            onToggleHeadingUp={() => {
              setIsHeadingUp(!isHeadingUp);
              NavigationFeedbackController.triggerHaptic('click');
            }}
            activeHazardAlert={activeHazard}
            hudMode={hudMode}
            onChangeHudMode={setHudMode}
            onEndRide={() => {
              setHasRideStarted(false);
              setIsSimulating(false);
              NavigationFeedbackController.speak('Ride navigation ended');
            }}
          />
        )}

        {/* Floating Quick Toggles (Layers, POI toggle, Elevation toggle) */}
        <div className={`absolute ${hasRideStarted ? (hudMode === 'compact' ? 'top-16' : 'top-32') : 'top-28'} right-3 z-[1050] flex flex-col gap-2`}>
          {/* Map Layer Theme Cycle */}
          <button
            onClick={() => {
              const themes: MapTileTheme[] = ['cyclosm', 'dark', 'sunlight', 'osm'];
              const nextIdx = (themes.indexOf(tileTheme) + 1) % themes.length;
              setTileTheme(themes[nextIdx]);
              NavigationFeedbackController.triggerHaptic('click');
            }}
            className="p-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-xl backdrop-blur-md transition active:scale-95"
            title={`Current map theme: ${tileTheme.toUpperCase()}. Click to switch layer`}
            aria-label="Switch map layer style"
          >
            <Layers className="w-5 h-5 text-emerald-400" />
          </button>

          {/* Toggle Bike POIs visibility */}
          <button
            onClick={() => {
              setShowPOIsOnMap(!showPOIsOnMap);
              NavigationFeedbackController.triggerHaptic('click');
            }}
            className={`p-2.5 rounded-xl border shadow-xl backdrop-blur-md transition active:scale-95 ${
              showPOIsOnMap 
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' 
                : 'bg-zinc-900/90 text-zinc-400 border-zinc-700'
            }`}
            title={showPOIsOnMap ? "Bike shops & pumps visible on map" : "Bike POIs hidden"}
            aria-label="Toggle bike shops visibility on map"
          >
            <Wrench className="w-5 h-5" />
          </button>

          {/* Toggle Elevation profile drawer */}
          <button
            onClick={() => setShowElevationProfile(!showElevationProfile)}
            className={`p-2.5 rounded-xl border shadow-xl backdrop-blur-md transition active:scale-95 ${
              showElevationProfile 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : 'bg-zinc-900/90 text-zinc-400 border-zinc-700'
            }`}
            title="Toggle elevation gradient profile"
            aria-label="Toggle elevation profile view"
          >
            <Bike className="w-5 h-5" />
          </button>
        </div>

        {/* Collapsible Elevation Profile Strip (positioned dynamically above HUD) */}
        {showElevationProfile && hudMode !== 'hidden' && (
          <div className={`absolute left-3 right-3 z-[990] max-w-xl mx-auto transition-all duration-300 ${
            !hasRideStarted 
              ? 'bottom-4' 
              : hudMode === 'compact' 
              ? 'bottom-16 sm:bottom-18' 
              : 'bottom-52 sm:bottom-56'
          }`}>
            <ElevationProfile
              points={activeRoute.points}
              currentPointIndex={currentPointIndex}
              totalDistanceKm={activeRoute.totalDistanceKm}
              totalElevationGainM={activeRoute.totalElevationGainM}
              maxElevationM={activeRoute.maxElevationM}
              isSunlightMode={isSunlightMode}
              isCompact={hasRideStarted && hudMode === 'compact'}
              onSelectPointIndex={(idx) => {
                setCurrentPointIndex(idx);
                NavigationFeedbackController.triggerHaptic('click');
              }}
            />
          </div>
        )}
      </main>

      {/* MODALS & DRAWERS */}
      {isTripPlannerOpen && (
        <TripPlannerModal
          route={activeRoute}
          fitness={fitness}
          preferredSpeedKmh={preferredSpeedKmh}
          onChangePreferredSpeed={(spd) => setPreferredSpeedKmh(spd)}
          onChangeFitness={(lvl) => setFitness(lvl)}
          onUpdateWaypoints={(wpts) => {
            setActiveRoute(prev => ({ ...prev, waypoints: wpts }));
          }}
          onClose={() => setIsTripPlannerOpen(false)}
          onStartRide={() => {
            setHasRideStarted(true);
            setIsSimulating(true);
            NavigationFeedbackController.speak('Starting ride navigation from Point A to Point B');
            NavigationFeedbackController.triggerHaptic('turn_soon');
          }}
        />
      )}

      {isNearbyDrawerOpen && (
        <NearbyPOIsDrawer
          pois={nearbyPOIs}
          currentLocationName={currentInstruction?.streetName || activeRoute.name}
          onSelectPOI={(poi) => {
            setIsNearbyDrawerOpen(false);
          }}
          onDetourToPOI={handleDetourToPOI}
          onClose={() => setIsNearbyDrawerOpen(false)}
        />
      )}

      {isOfflineModalOpen && (
        <OfflineManagerModal
          route={activeRoute}
          isOfflineMode={isOfflineMode}
          onToggleOfflineMode={(enabled) => {
            setIsOfflineMode(enabled);
            NavigationFeedbackController.speak(enabled ? 'Offline navigation mode engaged' : 'Online mode restored');
          }}
          onClose={() => setIsOfflineModalOpen(false)}
        />
      )}

      {isGPXModalOpen && (
        <GPXModal
          currentRoute={activeRoute}
          onImportRoute={handleSelectRoute}
          onClose={() => setIsGPXModalOpen(false)}
        />
      )}
    </div>
  );
}
