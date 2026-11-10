import React, { useState } from 'react';
import { TurnInstruction, CyclingStats, TurnManeuver } from '../types/cycling';
import { 
  ArrowUp, 
  ArrowUpRight, 
  ArrowRight, 
  CornerUpRight, 
  ArrowUpLeft, 
  ArrowLeft, 
  CornerUpLeft, 
  RotateCcw, 
  Flag,
  Volume2,
  VolumeX,
  Vibrate,
  Sun,
  Moon,
  Compass,
  Play,
  Pause,
  RotateCcw as ResetIcon,
  FastForward,
  AlertTriangle,
  HardHat,
  Wind,
  Minimize2,
  Maximize2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  XCircle,
  ArrowLeft as BackIcon
} from 'lucide-react';

interface CyclingHUDProps {
  currentInstruction?: TurnInstruction;
  stats: CyclingStats;
  isSimulating: boolean;
  simulationSpeed: number;
  isSunlightMode: boolean;
  isAudioMuted: boolean;
  isHapticsEnabled: boolean;
  isHeadingUp: boolean;
  currentBearing: number;
  onToggleSimulate: () => void;
  onResetSimulate: () => void;
  onChangeSimSpeed: (speed: number) => void;
  onToggleSunlightMode: () => void;
  onToggleAudio: () => void;
  onToggleHaptics: () => void;
  onToggleHeadingUp: () => void;
  activeHazardAlert?: { title: string; description: string; type: string } | null;
  onEndRide?: () => void;
  hudMode?: 'compact' | 'full' | 'hidden';
  onChangeHudMode?: (mode: 'compact' | 'full' | 'hidden') => void;
}

export const CyclingHUD: React.FC<CyclingHUDProps> = ({
  currentInstruction,
  stats,
  isSimulating,
  simulationSpeed,
  isSunlightMode,
  isAudioMuted,
  isHapticsEnabled,
  isHeadingUp,
  currentBearing,
  onToggleSimulate,
  onResetSimulate,
  onChangeSimSpeed,
  onToggleSunlightMode,
  onToggleAudio,
  onToggleHaptics,
  onToggleHeadingUp,
  activeHazardAlert,
  onEndRide,
  hudMode: controlledHudMode,
  onChangeHudMode
}) => {
  // HUD Display Mode: 'compact' (sleek 1-line glance bars), 'full' (detailed cockpit), 'hidden' (100% clean full map)
  const [internalMode, setInternalMode] = useState<'compact' | 'full' | 'hidden'>('compact');
  const hudMode = controlledHudMode ?? internalMode;
  const setHudMode = (m: 'compact' | 'full' | 'hidden') => {
    if (onChangeHudMode) onChangeHudMode(m);
    setInternalMode(m);
  };

  // Maneuver icon helper
  const renderManeuverIcon = (maneuver?: TurnManeuver, isSmall = false) => {
    const iconClass = isSmall ? "w-5 h-5 text-emerald-400 stroke-[2.5]" : "w-8 h-8 text-emerald-400 stroke-[2.5]";
    switch (maneuver) {
      case 'straight':
        return <ArrowUp className={iconClass} />;
      case 'slight_right':
        return <ArrowUpRight className={iconClass} />;
      case 'right':
        return <ArrowRight className={iconClass} />;
      case 'sharp_right':
        return <CornerUpRight className={iconClass} />;
      case 'slight_left':
        return <ArrowUpLeft className={iconClass} />;
      case 'left':
        return <ArrowLeft className={iconClass} />;
      case 'sharp_left':
        return <CornerUpLeft className={iconClass} />;
      case 'u_turn':
        return <RotateCcw className={iconClass} />;
      case 'arrive':
        return <Flag className={isSmall ? "w-5 h-5 text-amber-400 stroke-[2.5]" : "w-8 h-8 text-amber-400 stroke-[2.5]"} />;
      case 'depart':
      default:
        return <ArrowUp className={iconClass} />;
    }
  };

  // Grade color
  const grade = stats.currentGrade;
  const gradeColor = grade >= 7 
    ? 'bg-rose-600/90 text-white border-rose-500' 
    : grade >= 3 
    ? 'bg-amber-600/90 text-white border-amber-500' 
    : grade <= -3 
    ? 'bg-emerald-600/90 text-white border-emerald-500' 
    : 'bg-zinc-800 text-zinc-300 border-zinc-700';

  const formatTurnDist = (distM?: number) => {
    if (distM === undefined || distM === null) return '';
    return distM < 1000 ? `${Math.round(distM)}m` : `${(distM / 1000).toFixed(1)}km`;
  };

  /* =========================================================================
     MODE 1: HIDDEN (100% CLEAN FULL-SCREEN MAP)
     All panels collapsed away so rider has full view of map
     ========================================================================= */
  if (hudMode === 'hidden') {
    return (
      <div className="absolute top-4 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none max-w-xl mx-auto">
        {/* Floating Mini Glance Pill (tap to unhide) */}
        <button
          onClick={() => setHudMode('compact')}
          className={`pointer-events-auto px-3.5 py-1.5 rounded-full border shadow-2xl backdrop-blur-xl flex items-center gap-2.5 transition active:scale-95 cursor-pointer ${
            isSunlightMode 
              ? 'bg-white/95 text-zinc-950 border-zinc-400 shadow-black/20 ring-2 ring-black/10' 
              : 'bg-zinc-950/90 text-white border-zinc-700/80 shadow-black/60 ring-1 ring-white/10'
          }`}
          title="Click to show Navigation HUD panels"
        >
          {currentInstruction && (
            <div className="flex items-center gap-1 font-mono font-bold text-xs">
              {renderManeuverIcon(currentInstruction.maneuver, true)}
              <span className="text-emerald-400">{formatTurnDist(currentInstruction.distanceToTurn)}</span>
            </div>
          )}
          <div className="h-3 w-px bg-current opacity-30"></div>
          <div className="flex items-center gap-1 font-mono font-black text-xs text-emerald-400">
            <span>{stats.currentSpeed.toFixed(1)}</span>
            <span className="text-[10px] opacity-70">km/h</span>
          </div>
          <Eye className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
        </button>

        {/* Small Exit & Simulation Pill */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={onToggleSimulate}
            className={`p-2 rounded-full border shadow-xl backdrop-blur-xl transition active:scale-95 cursor-pointer ${
              isSimulating ? 'bg-amber-500 text-black border-amber-400' : 'bg-emerald-500 text-black border-emerald-400'
            }`}
            title={isSimulating ? "Pause navigation" : "Resume navigation"}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>

          {onEndRide && (
            <button
              onClick={onEndRide}
              className="p-2 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-500 shadow-xl backdrop-blur-xl transition active:scale-95 cursor-pointer"
              title="End ride and return to route planner"
            >
              <BackIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  /* =========================================================================
     MODE 2: COMPACT MODE (SLEEK 1-LINE GLANCE BARS - OVER 90% MAP VISIBILITY)
     ========================================================================= */
  if (hudMode === 'compact') {
    return (
      <>
        {/* COMPACT TOP TURN BAR */}
        <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none max-w-xl mx-auto">
          <div className={`pointer-events-auto rounded-2xl shadow-2xl border transition-all duration-300 p-2.5 flex items-center justify-between gap-2.5 backdrop-blur-xl ${
            isSunlightMode
              ? 'bg-white/95 border-zinc-300 text-zinc-950 ring-2 ring-black/10'
              : 'bg-zinc-950/95 border-zinc-800 text-white ring-1 ring-white/10'
          }`}>
            {/* Turn Icon & Instruction */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                {renderManeuverIcon(currentInstruction?.maneuver, true)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-base sm:text-lg font-black font-mono tracking-tight text-white">
                    {formatTurnDist(currentInstruction?.distanceToTurn)}
                  </span>
                  <span className="text-xs font-bold truncate text-emerald-400">
                    {currentInstruction?.instruction || 'Continue on route'}
                  </span>
                </div>
                <div className="text-[11px] opacity-70 truncate">
                  onto {currentInstruction?.streetName || 'Designated Cycle Path'}
                </div>
              </div>
            </div>

            {/* Compact Quick Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Compass Toggle */}
              <button
                onClick={onToggleHeadingUp}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition active:scale-95 cursor-pointer ${
                  isHeadingUp
                    ? 'bg-sky-500 text-white border-sky-400'
                    : isSunlightMode ? 'bg-zinc-100 text-zinc-700 border-zinc-300' : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                }`}
                title="Toggle Auto-Rotation Heading"
              >
                <Compass 
                  className="w-3.5 h-3.5 transition-transform duration-300" 
                  style={{ transform: `rotate(${isHeadingUp ? 0 : -currentBearing}deg)` }} 
                />
              </button>

              {/* Expand to Full Cockpit */}
              <button
                onClick={() => setHudMode('full')}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Expand to Full Cockpit"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Hide All Panels (Clean Full Map) */}
              <button
                onClick={() => setHudMode('hidden')}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Hide All Panels (Clean Full-Screen Map)"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* COMPACT BOTTOM GLANCE STRIP */}
        <div className="absolute bottom-3 left-3 right-3 z-[1000] pointer-events-none max-w-xl mx-auto">
          <div className={`pointer-events-auto rounded-2xl shadow-2xl border transition-all duration-300 px-3 py-2 flex items-center justify-between gap-2 backdrop-blur-xl ${
            isSunlightMode
              ? 'bg-white/95 border-zinc-300 text-zinc-950 ring-2 ring-black/10'
              : 'bg-zinc-950/95 border-zinc-800 text-white ring-1 ring-white/10'
          }`}>
            {/* Speed & Grade Glance */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-400">
                  {stats.currentSpeed.toFixed(1)}
                </span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">km/h</span>
              </div>

              <div className={`px-1.5 py-0.5 rounded text-[10px] font-black font-mono border ${gradeColor}`}>
                {grade > 0 ? `+${grade.toFixed(1)}%` : `${grade.toFixed(1)}%`}
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-semibold text-zinc-300">
                <span>{Math.round(stats.currentAltitude)}m alt</span>
                <span className="opacity-40">•</span>
                <span>{stats.distanceRemainingKm.toFixed(1)} km left</span>
              </div>
            </div>

            {/* Quick Simulation & Controls */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={onToggleSimulate}
                className={`px-2.5 py-1 rounded-lg font-black text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer ${
                  isSimulating ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'
                }`}
              >
                {isSimulating ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                <span>{isSimulating ? 'PAUSE' : 'RIDE'}</span>
              </button>

              <button
                onClick={() => setHudMode('full')}
                className="p-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                title="Open Full Metrics Panel"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>

              {onEndRide && (
                <button
                  onClick={onEndRide}
                  className="px-2 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition cursor-pointer"
                  title="End ride"
                >
                  End
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  /* =========================================================================
     MODE 3: FULL COCKPIT (DETAILED GAUGES, METRICS, SETTINGS)
     ========================================================================= */
  return (
    <>
      {/* TOP NAVIGATION BANNER */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none max-w-xl mx-auto">
        {/* Main Turn Instruction Card */}
        {currentInstruction && (
          <div className={`pointer-events-auto rounded-2xl shadow-2xl border transition-all duration-300 overflow-hidden ${
            isSunlightMode
              ? 'bg-white border-zinc-300 text-zinc-950 ring-2 ring-black/10'
              : 'bg-zinc-950/95 border-zinc-800/80 text-white backdrop-blur-xl ring-1 ring-white/10'
          }`}>
            <div className="flex items-center gap-3.5 p-3.5 sm:p-4">
              {/* Turn Icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                {renderManeuverIcon(currentInstruction.maneuver)}
              </div>

              {/* Maneuver Text & Countdown */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
                    {formatTurnDist(currentInstruction.distanceToTurn)}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Cycle Path
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold truncate leading-tight mt-0.5">
                  {currentInstruction.instruction}
                </p>
                <p className="text-xs opacity-75 truncate font-medium">
                  onto {currentInstruction.streetName}
                </p>
              </div>

              {/* Actions: Compass & Collapse to Compact */}
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  onClick={onToggleHeadingUp}
                  title={isHeadingUp ? "Auto-Rotating Map (Heading Up). Click for North Up" : "North Up. Click for Auto-Rotate (Heading Up)"}
                  className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border transition-transform active:scale-95 cursor-pointer ${
                    isHeadingUp
                      ? 'bg-sky-500 text-white border-sky-400 shadow-sky-500/30 shadow-md'
                      : isSunlightMode ? 'bg-zinc-100 border-zinc-300 text-zinc-700' : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                  }`}
                  aria-label="Toggle map auto-rotation heading"
                >
                  <Compass 
                    className="w-4 h-4 transition-transform duration-300" 
                    style={{ transform: `rotate(${isHeadingUp ? 0 : -currentBearing}deg)` }} 
                  />
                  <span className="text-[8px] font-bold leading-none mt-0.5">
                    {isHeadingUp ? 'HEAD' : 'NORTH'}
                  </span>
                </button>

                <button
                  onClick={() => setHudMode('compact')}
                  className="w-10 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                  title="Collapse to Compact Mode"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* In-Card Warning/Climb Alert if present */}
            {currentInstruction.alertType && (
              <div className="bg-rose-500/20 border-t border-rose-500/30 px-3.5 py-1.5 flex items-center gap-2 text-rose-300 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="truncate">{currentInstruction.alertMessage || 'Steep climb gradient ahead'}</span>
              </div>
            )}
          </div>
        )}

        {/* Real-time Severe Alert / Hazard Banner (Floating) */}
        {activeHazardAlert && (
          <div className="pointer-events-auto rounded-xl bg-rose-600/95 text-white border border-rose-400 shadow-xl p-3 flex items-start gap-3 backdrop-blur-md animate-bounce-once">
            <div className="p-1.5 rounded-lg bg-black/20">
              {activeHazardAlert.type === 'construction' ? (
                <HardHat className="w-5 h-5" />
              ) : activeHazardAlert.type === 'severe_weather' ? (
                <Wind className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-rose-200">Alert Ahead on Route</p>
              <p className="text-sm font-bold truncate">{activeHazardAlert.title}</p>
              <p className="text-xs text-rose-100 opacity-90">{activeHazardAlert.description}</p>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM HUD COCKPIT */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none max-w-xl mx-auto">
        <div className={`pointer-events-auto rounded-2xl shadow-2xl border transition-all duration-300 p-3 sm:p-4 ${
          isSunlightMode
            ? 'bg-white border-zinc-300 text-zinc-950 ring-2 ring-black/15'
            : 'bg-zinc-950/95 border-zinc-800/90 text-white backdrop-blur-xl ring-1 ring-white/10'
        }`}>
          {/* Top Quick Action Bar: Controls, Mode Toggles */}
          <div className="flex items-center justify-between pb-3 border-b border-inherit gap-2">
            {/* Simulation controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleSimulate}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer ${
                  isSimulating
                    ? 'bg-amber-500 hover:bg-amber-600 text-black'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-black'
                }`}
                aria-label={isSimulating ? "Pause ride simulation" : "Start ride simulation"}
              >
                {isSimulating ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isSimulating ? 'PAUSE' : 'RIDE'}</span>
              </button>

              <button
                onClick={onResetSimulate}
                className="p-1.5 rounded-lg border border-inherit hover:bg-white/10 text-inherit transition active:scale-95 cursor-pointer"
                title="Reset simulation to start"
                aria-label="Reset simulation"
              >
                <ResetIcon className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  const nextSpeed = simulationSpeed === 1 ? 2 : simulationSpeed === 2 ? 5 : 1;
                  onChangeSimSpeed(nextSpeed);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-inherit text-xs font-mono font-bold hover:bg-white/10 cursor-pointer"
                title="Change simulation replay speed"
                aria-label="Toggle simulation replay speed"
              >
                <FastForward className="w-3 h-3" />
                {simulationSpeed}x
              </button>
            </div>

            {/* Rider preferences & Collapse Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleSunlightMode}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isSunlightMode 
                    ? 'bg-amber-400 text-black border-amber-500 shadow-md' 
                    : 'border-inherit hover:bg-white/10'
                }`}
                title="Toggle Sunlight High-Contrast Mode for bright daylight riding"
                aria-label="Toggle sunlight high contrast mode"
              >
                {isSunlightMode ? <Sun className="w-4 h-4 fill-current" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                onClick={onToggleAudio}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  !isAudioMuted 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                    : 'border-inherit opacity-50 hover:opacity-100'
                }`}
                title="Toggle audio voice navigation cues"
                aria-label="Toggle audio cues"
              >
                {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={onToggleHaptics}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isHapticsEnabled 
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' 
                    : 'border-inherit opacity-50 hover:opacity-100'
                }`}
                title="Toggle vibration / haptic cues on turns"
                aria-label="Toggle vibration feedback"
              >
                <Vibrate className="w-4 h-4" />
              </button>

              {/* Collapse to Compact Mode Button */}
              <button
                onClick={() => setHudMode('compact')}
                className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition cursor-pointer"
                title="Collapse panels to compact view"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Hide All Panels Button */}
              <button
                onClick={() => setHudMode('hidden')}
                className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
                title="Hide all panels (100% map view)"
              >
                <EyeOff className="w-4 h-4" />
              </button>

              {onEndRide && (
                <button
                  onClick={onEndRide}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs transition cursor-pointer ml-1"
                  title="End ride navigation"
                >
                  End Ride
                </button>
              )}
            </div>
          </div>

          {/* MAIN CYCLING COCKPIT GAUGES */}
          <div className="grid grid-cols-4 gap-2 pt-3 text-center">
            {/* Speed Gauge */}
            <div className="col-span-2 flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-900/40 border border-inherit">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-60">SPEED</span>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-emerald-400">
                  {stats.currentSpeed.toFixed(1)}
                </span>
                <span className="text-xs font-bold opacity-75">km/h</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] opacity-75 font-mono">
                <span>Avg {stats.averageSpeed.toFixed(1)}</span>
                <span>•</span>
                <span>Max {stats.maxSpeed.toFixed(1)}</span>
              </div>
            </div>

            {/* Gradient / Slope Slope Tag */}
            <div className="col-span-1 flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-900/40 border border-inherit">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-60">SLOPE</span>
              <div className={`mt-1 px-2 py-0.5 rounded-lg text-xs font-black font-mono border ${gradeColor}`}>
                {grade > 0 ? `+${grade.toFixed(1)}%` : `${grade.toFixed(1)}%`}
              </div>
              <span className="text-[9px] opacity-70 mt-1 uppercase font-semibold">
                {grade >= 7 ? 'Steep Climb' : grade >= 3 ? 'Incline' : grade <= -3 ? 'Descent' : 'Flat'}
              </span>
            </div>

            {/* Altitude & Elevation Gain */}
            <div className="col-span-1 flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-900/40 border border-inherit">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-60">ALTITUDE</span>
              <div className="text-sm font-black font-mono mt-1 text-white">
                {Math.round(stats.currentAltitude)}m
              </div>
              <span className="text-[10px] font-mono text-emerald-400 mt-1 font-semibold">
                +{stats.totalElevationGain}m gain
              </span>
            </div>
          </div>

          {/* SECONDARY TRIP PROGRESS BAR */}
          <div className="mt-3 pt-2.5 border-t border-inherit flex items-center justify-between text-xs font-mono">
            <div>
              <span className="opacity-60 block text-[9px] uppercase font-sans font-bold">REMAINING</span>
              <span className="font-bold text-white">{stats.distanceRemainingKm.toFixed(1)} km</span>
            </div>

            <div>
              <span className="opacity-60 block text-[9px] uppercase font-sans font-bold">EST. ARRIVAL</span>
              <span className="font-bold text-sky-400">
                {stats.estimatedRemainingMinutes} min
              </span>
            </div>

            <div>
              <span className="opacity-60 block text-[9px] uppercase font-sans font-bold">MAX ALT</span>
              <span className="font-bold text-amber-400">{stats.maxAltitude}m</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
