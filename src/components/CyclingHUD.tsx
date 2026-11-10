import React from 'react';
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
  Wind
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
  activeHazardAlert
}) => {
  // Maneuver icon helper
  const renderManeuverIcon = (maneuver?: TurnManeuver) => {
    const iconClass = "w-8 h-8 text-emerald-400 stroke-[2.5]";
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
        return <Flag className="w-8 h-8 text-amber-400 stroke-[2.5]" />;
      case 'depart':
      default:
        return <ArrowUp className={iconClass} />;
    }
  };

  // Grade color
  const grade = stats.currentGrade;
  const gradeColor = grade >= 8 
    ? 'bg-rose-600/90 text-white border-rose-500' 
    : grade >= 4 
    ? 'bg-amber-600/90 text-white border-amber-500' 
    : grade <= -4 
    ? 'bg-emerald-600/90 text-white border-emerald-500' 
    : 'bg-zinc-800 text-zinc-300 border-zinc-700';

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
              {/* Turn Icon with High-Contrast Background */}
              <div className="flex-shrink-0 w-13 h-13 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                {renderManeuverIcon(currentInstruction.maneuver)}
              </div>

              {/* Maneuver Text & Countdown */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
                    {currentInstruction.distanceToTurn < 1000
                      ? `${Math.round(currentInstruction.distanceToTurn)} m`
                      : `${(currentInstruction.distanceToTurn / 1000).toFixed(1)} km`}
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

              {/* Auto-Rotation Compass Toggle */}
              <button
                onClick={onToggleHeadingUp}
                title={isHeadingUp ? "Auto-Rotating Map (Heading Up). Click for North Up" : "North Up. Click for Auto-Rotate (Heading Up)"}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-11 h-11 rounded-xl border transition-transform active:scale-95 ${
                  isHeadingUp
                    ? 'bg-sky-500 text-white border-sky-400 shadow-sky-500/30 shadow-md'
                    : isSunlightMode ? 'bg-zinc-100 border-zinc-300 text-zinc-700' : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                }`}
                aria-label="Toggle map auto-rotation heading"
              >
                <Compass 
                  className="w-5 h-5 transition-transform duration-300" 
                  style={{ transform: `rotate(${isHeadingUp ? 0 : -currentBearing}deg)` }} 
                />
                <span className="text-[9px] font-bold leading-none mt-0.5">
                  {isHeadingUp ? 'HEAD' : 'NORTH'}
                </span>
              </button>
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 ${
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
                className="p-1.5 rounded-lg border border-inherit hover:bg-white/10 text-inherit transition active:scale-95"
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
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-inherit text-xs font-mono font-bold hover:bg-white/10"
                title="Change simulation replay speed"
                aria-label="Toggle simulation replay speed"
              >
                <FastForward className="w-3 h-3" />
                {simulationSpeed}x
              </button>
            </div>

            {/* Rider preferences: Sunlight, Audio, Haptics */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleSunlightMode}
                className={`p-2 rounded-xl border transition ${
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
                className={`p-2 rounded-xl border transition ${
                  !isAudioMuted 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                    : 'border-inherit opacity-60 hover:opacity-100'
                }`}
                title={isAudioMuted ? "Audio Turn Cues Muted" : "Voice Navigation Active"}
                aria-label="Toggle audio voice navigation"
              >
                {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={onToggleHaptics}
                className={`p-2 rounded-xl border transition ${
                  isHapticsEnabled 
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' 
                    : 'border-inherit opacity-60 hover:opacity-100'
                }`}
                title={isHapticsEnabled ? "Haptic Turn Vibrations On" : "Haptics Disabled"}
                aria-label="Toggle haptic vibration cues"
              >
                <Vibrate className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* MAIN SPEED AND COCKPIT METRICS (GLANCEABLE AT 40 KM/H) */}
          <div className="grid grid-cols-4 gap-2 pt-3 items-center">
            {/* Speed Dial - Big & Bold */}
            <div className="col-span-2 flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-60">SPEED</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-emerald-400">
                  {stats.currentSpeed.toFixed(1)}
                </span>
                <span className="text-xs font-bold font-mono opacity-80">km/h</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] opacity-75 font-mono">
                <span>Avg: {stats.averageSpeed.toFixed(1)}</span>
                <span>Max: {stats.maxSpeed.toFixed(1)}</span>
              </div>
            </div>

            {/* Grade % Slope Badge */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-60 mb-1">GRADE</span>
              <div className={`px-2.5 py-1 rounded-xl text-center font-black font-mono text-sm border shadow-sm ${gradeColor}`}>
                {grade > 0 ? `+${grade.toFixed(1)}%` : `${grade.toFixed(1)}%`}
              </div>
              <span className="text-[9px] font-bold mt-1 opacity-70">
                {grade >= 7 ? 'STEEP' : grade >= 3 ? 'CLIMB' : grade <= -3 ? 'DESCENT' : 'FLAT'}
              </span>
            </div>

            {/* Elevation & Gain */}
            <div className="col-span-1 flex flex-col items-end justify-center">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-60">ALTITUDE</span>
              <div className="text-lg font-black font-mono">
                {Math.round(stats.currentAltitude)} <span className="text-[10px] font-normal">m</span>
              </div>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">
                +{stats.totalElevationGain}m gain
              </div>
            </div>
          </div>

          {/* Bottom Trip Progress Strip */}
          <div className="mt-3 pt-2.5 border-t border-inherit flex items-center justify-between text-xs font-mono">
            <div>
              <span className="opacity-60 text-[10px] block">REMAINING</span>
              <span className="font-bold text-sm text-sky-400">
                {stats.distanceRemainingKm.toFixed(1)} km
              </span>
            </div>

            <div className="text-center">
              <span className="opacity-60 text-[10px] block">EST. TIME</span>
              <span className="font-bold text-sm">
                {stats.estimatedRemainingMinutes} min
              </span>
            </div>

            <div className="text-right">
              <span className="opacity-60 text-[10px] block">MAX PEAK</span>
              <span className="font-bold text-sm text-indigo-400">
                {stats.maxAltitude} m
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
