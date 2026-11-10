import React, { useState, useMemo } from 'react';
import { CyclingRoute, Waypoint, FitnessLevel, SegmentWeather } from '../types/cycling';
import { 
  FITNESS_PROFILES, 
  calculateCustomSegmentsWithSpeed, 
  CustomSegment, 
  formatDuration 
} from '../utils/cyclingEstimator';
import { SegmentSliderAltitudeGraph } from './SegmentSliderAltitudeGraph';
import { 
  Calendar, 
  MapPin, 
  CloudSun, 
  Wind, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  X, 
  Check, 
  Zap, 
  Coffee, 
  Tent, 
  Hotel, 
  Mountain,
  BellRing,
  Gauge,
  Sliders,
  Play
} from 'lucide-react';

interface TripPlannerModalProps {
  route: CyclingRoute;
  fitness: FitnessLevel;
  preferredSpeedKmh: number;
  onChangePreferredSpeed: (speed: number) => void;
  onChangeFitness: (level: FitnessLevel) => void;
  onUpdateWaypoints: (waypoints: Waypoint[]) => void;
  onClose: () => void;
  onSelectStage?: (stageIndex: number) => void;
  onStartRide?: () => void;
}

export const TripPlannerModal: React.FC<TripPlannerModalProps> = ({
  route,
  fitness,
  preferredSpeedKmh,
  onChangePreferredSpeed,
  onChangeFitness,
  onUpdateWaypoints,
  onClose,
  onSelectStage,
  onStartRide
}) => {
  const [activeTab, setActiveTab] = useState<'segments' | 'waypoints' | 'fitness'>('segments');
  const [segmentCount, setSegmentCount] = useState<number>(route.stagesCount || (route.isMultiDay ? 3 : 2));

  // Initialize split percentages evenly across segments
  const [splitPercentages, setSplitPercentages] = useState<number[]>(() => {
    const count = route.stagesCount || (route.isMultiDay ? 3 : 2);
    if (count === 2) return [50];
    if (count === 3) return [33, 66];
    if (count === 4) return [25, 50, 75];
    return [50];
  });

  const [newWptName, setNewWptName] = useState('');
  const [newWptType, setNewWptType] = useState<'camp' | 'hotel' | 'cafe' | 'viewpoint'>('cafe');
  const [weatherAlertNotification, setWeatherAlertNotification] = useState<string | null>(null);

  // When segment count changes, re-space splits
  const handleSegmentCountChange = (count: number) => {
    setSegmentCount(count);
    if (count === 2) setSplitPercentages([50]);
    else if (count === 3) setSplitPercentages([33, 66]);
    else if (count === 4) setSplitPercentages([25, 50, 75]);
  };

  // Calculate custom segments dynamically using slider percentages and preferred speed
  const customSegments = useMemo(() => {
    return calculateCustomSegmentsWithSpeed(route.points, splitPercentages, preferredSpeedKmh);
  }, [route.points, splitPercentages, preferredSpeedKmh]);

  // Overall calculated duration and avg speed from custom segments
  const totalCalculatedMinutes = customSegments.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalDistance = route.totalDistanceKm;

  // Trigger push alert test
  const handleTriggerWeatherAlert = (weather: SegmentWeather) => {
    if (weather.severeAlert) {
      setWeatherAlertNotification(weather.severeAlert);
      setTimeout(() => setWeatherAlertNotification(null), 6000);
    }
  };

  const handleAddWaypoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWptName.trim()) return;

    const randomPt = route.points[Math.floor(route.points.length * (0.3 + Math.random() * 0.4))] || route.points[0];
    const newWpt: Waypoint = {
      id: `custom-wpt-${Date.now()}`,
      name: newWptName.trim(),
      lat: randomPt.lat + (Math.random() - 0.5) * 0.005,
      lng: randomPt.lng + (Math.random() - 0.5) * 0.005,
      isStopover: true,
      stopoverType: newWptType,
      notes: `Custom stopover added by rider (${newWptType})`
    };

    onUpdateWaypoints([...route.waypoints, newWpt]);
    setNewWptName('');
  };

  const handleRemoveWaypoint = (id: string) => {
    onUpdateWaypoints(route.waypoints.filter(w => w.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg sm:text-xl font-bold">Route Planner & Segment Studio</h2>
              <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {customSegments.length} Segments
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Altitude graph with slider-mapped segment splits & custom speed pacing
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            aria-label="Close trip planner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Severe Weather Toast Push Notification Banner */}
        {weatherAlertNotification && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-rose-600 text-white flex items-center justify-between shadow-lg animate-bounce-once">
            <div className="flex items-center gap-2.5">
              <BellRing className="w-5 h-5 flex-shrink-0 animate-pulse" />
              <span className="text-xs font-bold">{weatherAlertNotification}</span>
            </div>
            <button onClick={() => setWeatherAlertNotification(null)} className="p-1 text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dynamic Trip Summary Strip (Updates with speed & segment adjustments) */}
        <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-zinc-950/70 border-b border-zinc-800/80 text-center text-xs">
          <div>
            <span className="text-zinc-500 block text-[10px] font-bold">TOTAL DISTANCE</span>
            <span className="text-base font-black font-mono text-zinc-100">{totalDistance} km</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] font-bold">ELEVATION GAIN</span>
            <span className="text-base font-black font-mono text-emerald-400">+{route.totalElevationGainM} m</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] font-bold">EST. TOTAL DURATION</span>
            <span className="text-base font-black font-mono text-sky-400">{formatDuration(totalCalculatedMinutes)}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 px-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('segments')}
            className={`py-3 px-3.5 border-b-2 transition ${
              activeTab === 'segments'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Altitude Graph & Sliders ({customSegments.length})
          </button>
          <button
            onClick={() => setActiveTab('waypoints')}
            className={`py-3 px-3.5 border-b-2 transition ${
              activeTab === 'waypoints'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Custom Stopovers ({route.waypoints.length})
          </button>
          <button
            onClick={() => setActiveTab('fitness')}
            className={`py-3 px-3.5 border-b-2 transition ${
              activeTab === 'fitness'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Rider Profile & Pace
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: ALTITUDE GRAPH, SLIDERS & PREFERRED SPEED */}
          {activeTab === 'segments' && (
            <div className="space-y-4">
              {/* PREFERRED SPEED CONTROL CARD */}
              <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Preferred Cycling Speed
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-xl font-black text-emerald-400">{preferredSpeedKmh}</span>
                    <span className="text-xs text-zinc-400">km/h</span>
                  </div>
                </div>

                {/* Speed Slider */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-500">12 km/h</span>
                  <input
                    type="range"
                    min={12}
                    max={42}
                    step={1}
                    value={preferredSpeedKmh}
                    onChange={(e) => onChangePreferredSpeed(parseInt(e.target.value, 10))}
                    className="flex-1 accent-emerald-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
                    aria-label="Set preferred cycling speed in km/h"
                  />
                  <span className="text-[10px] font-mono text-zinc-500">42 km/h</span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs pt-0.5">
                  {[
                    { label: 'Casual', speed: 16 },
                    { label: 'Commuter', speed: 20 },
                    { label: 'Touring', speed: 24 },
                    { label: 'Sportive', speed: 28 },
                    { label: 'Pro', speed: 32 },
                    { label: 'E-Bike', speed: 25 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => onChangePreferredSpeed(p.speed)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        preferredSpeedKmh === p.speed
                          ? 'bg-emerald-500 text-black font-bold'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {p.label} ({p.speed})
                    </button>
                  ))}
                </div>
              </div>

              {/* SEGMENT COUNT SELECTOR */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-zinc-400">Number of Route Segments:</span>
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  {[2, 3, 4].map((count) => (
                    <button
                      key={count}
                      onClick={() => handleSegmentCountChange(count)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        segmentCount === count
                          ? 'bg-emerald-500 text-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {count} Segments
                    </button>
                  ))}
                </div>
              </div>

              {/* ALTITUDE GRAPH WITH MAPPED SLIDERS */}
              <SegmentSliderAltitudeGraph
                points={route.points}
                totalDistanceKm={route.totalDistanceKm}
                totalElevationGainM={route.totalElevationGainM}
                maxElevationM={route.maxElevationM}
                splitPercentages={splitPercentages}
                onChangeSplits={(splits) => setSplitPercentages(splits)}
                segments={customSegments}
              />

              {/* PER-SEGMENT DURATION & DIFFICULTY CARDS */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 px-1">
                  <span>Segment Breakdown (Paced for {preferredSpeedKmh} km/h)</span>
                  <span className="font-mono text-emerald-400">Total: {formatDuration(totalCalculatedMinutes)}</span>
                </div>

                <div className="space-y-2.5">
                  {customSegments.map((seg, idx) => {
                    const forecast = route.weatherForecast?.[idx];
                    const segColorClass = idx === 0 
                      ? 'border-emerald-500/40 bg-emerald-500/5' 
                      : idx === 1 
                      ? 'border-sky-500/40 bg-sky-500/5' 
                      : idx === 2 
                      ? 'border-amber-500/40 bg-amber-500/5' 
                      : 'border-purple-500/40 bg-purple-500/5';

                    return (
                      <div
                        key={seg.segmentIndex}
                        className={`p-3.5 rounded-2xl border ${segColorClass} transition space-y-2.5`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-black">
                              {seg.segmentIndex}
                            </span>
                            <span className="font-bold text-sm text-zinc-100">
                              Segment {seg.segmentIndex} ({seg.startDistanceKm} km → {seg.endDistanceKm} km)
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-sky-400">
                            Est. {formatDuration(seg.durationMinutes)}
                          </span>
                        </div>

                        {/* Segment Metrics */}
                        <div className="grid grid-cols-4 gap-2 text-xs font-mono bg-zinc-900/80 p-2.5 rounded-xl text-center">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">DISTANCE</span>
                            <span className="font-bold text-zinc-200">{seg.distanceKm} km</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block">ELEV GAIN</span>
                            <span className="font-bold text-emerald-400">+{seg.elevationGainM} m</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block">MAX PEAK</span>
                            <span className="font-bold text-indigo-400">{seg.maxAltitudeM} m</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block">AVG SPEED</span>
                            <span className="font-bold text-zinc-200">{seg.avgSpeedKmh} km/h</span>
                          </div>
                        </div>

                        {/* Segment Weather if available */}
                        {forecast && (
                          <div className={`p-2 rounded-xl text-xs flex items-center justify-between ${
                            forecast.severeAlert ? 'bg-rose-500/20 text-rose-200' : 'bg-zinc-900/60 text-zinc-300'
                          }`}>
                            <div className="flex items-center gap-2">
                              <CloudSun className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              <span className="font-medium truncate">
                                {forecast.tempC}°C ({forecast.tempF}°F) • {forecast.conditions} • {forecast.windDirection}
                              </span>
                            </div>

                            {forecast.severeAlert && (
                              <button
                                onClick={() => handleTriggerWeatherAlert(forecast)}
                                className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px] flex items-center gap-1 hover:bg-rose-500 flex-shrink-0"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                <span>Alert</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM STOPOVERS & WAYPOINTS */}
          {activeTab === 'waypoints' && (
            <div className="space-y-4">
              {/* Add Stopover Form */}
              <form onSubmit={handleAddWaypoint} className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <span className="text-xs font-bold text-zinc-300">Add Stopover / Waypoint Along Route</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWptName}
                    onChange={(e) => setNewWptName(e.target.value)}
                    placeholder="e.g. Ridgeview Campsite or Bakery"
                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <select
                    value={newWptType}
                    onChange={(e) => setNewWptType(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm"
                  >
                    <option value="camp">⛺ Campsite</option>
                    <option value="hotel">🏨 Lodge</option>
                    <option value="cafe">☕ Cafe</option>
                    <option value="viewpoint">⛰️ Viewpoint</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
              </form>

              {/* Waypoint List */}
              <div className="space-y-2">
                {route.waypoints.map((wpt) => (
                  <div
                    key={wpt.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/70 border border-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold">
                        {wpt.stopoverType === 'camp' ? <Tent className="w-4 h-4 text-emerald-400" /> :
                         wpt.stopoverType === 'hotel' ? <Hotel className="w-4 h-4 text-sky-400" /> :
                         wpt.stopoverType === 'cafe' ? <Coffee className="w-4 h-4 text-amber-400" /> :
                         wpt.stopoverType === 'viewpoint' ? <Mountain className="w-4 h-4 text-indigo-400" /> :
                         <MapPin className="w-4 h-4 text-zinc-400" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                          <span>{wpt.name}</span>
                          {wpt.isStopover && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              Stopover
                            </span>
                          )}
                        </div>
                        {wpt.notes && <div className="text-xs text-zinc-400">{wpt.notes}</div>}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveWaypoint(wpt.id)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 transition"
                      aria-label={`Remove waypoint ${wpt.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CYCLIST FITNESS PROFILES */}
          {activeTab === 'fitness' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Choose a baseline profile or enter your custom preferred speed in the Segments tab.
              </p>

              {(Object.keys(FITNESS_PROFILES) as FitnessLevel[]).map((level) => {
                const conf = FITNESS_PROFILES[level];
                const isSelected = fitness === level;
                return (
                  <button
                    key={level}
                    onClick={() => {
                      onChangeFitness(level);
                      onChangePreferredSpeed(conf.baseFlatSpeedKmh);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <span>{conf.name}</span>
                        {level === 'ebike' && <Zap className="w-4 h-4 text-amber-400" />}
                        <span className="text-xs font-mono text-emerald-400">
                          ~{conf.baseFlatSpeedKmh} km/h base
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{conf.description}</p>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer with "Apply & Start Ride" */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-bold text-xs"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs transition"
            >
              Save Segments
            </button>

            {onStartRide && (
              <button
                onClick={() => {
                  onClose();
                  onStartRide();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START RIDE NOW</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
