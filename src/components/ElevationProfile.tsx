import React from 'react';
import { RoutePoint } from '../types/cycling';
import { formatDistance, formatElevation } from '../utils/geo';
import { TrendingUp, Mountain, AlertTriangle } from 'lucide-react';

interface ElevationProfileProps {
  points: RoutePoint[];
  currentPointIndex: number;
  totalDistanceKm: number;
  totalElevationGainM: number;
  maxElevationM: number;
  onSelectPointIndex?: (index: number) => void;
  isSunlightMode?: boolean;
}

export const ElevationProfile: React.FC<ElevationProfileProps> = ({
  points,
  currentPointIndex,
  totalDistanceKm,
  totalElevationGainM,
  maxElevationM,
  onSelectPointIndex,
  isSunlightMode = false
}) => {
  if (!points.length) return null;

  // Compute min and max elevation with padding for chart
  const elevations = points.map(p => p.ele ?? 0);
  const minEle = Math.max(0, Math.min(...elevations) - 10);
  const maxEle = Math.max(...elevations, 50);
  const eleRange = Math.max(1, maxEle - minEle);

  // SVG dimensions
  const width = 1000;
  const height = 110;
  const paddingBottom = 22;
  const paddingTop = 12;
  const chartHeight = height - paddingBottom - paddingTop;

  // Build path coordinates
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const normEle = ((p.ele ?? 0) - minEle) / eleRange;
    const y = height - paddingBottom - normEle * chartHeight;
    return { x, y, point: p, index: i };
  });

  const linePath = coords.reduce((acc, c, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`, '');
  const areaPath = `${linePath} L ${width} ${height - paddingBottom} L 0 ${height - paddingBottom} Z`;

  // Rider position on chart
  const currentCoord = coords[Math.min(currentPointIndex, coords.length - 1)] || coords[0];
  const currentGrade = points[currentPointIndex]?.grade ?? 0;

  return (
    <div className={`rounded-xl border transition-colors shadow-lg overflow-hidden ${
      isSunlightMode 
        ? 'bg-amber-50/95 border-amber-300 text-zinc-950' 
        : 'bg-zinc-900/90 border-zinc-800 text-zinc-100 backdrop-blur-md'
    }`}>
      {/* Header Info */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-inherit text-xs">
        <div className="flex items-center gap-3 font-semibold">
          <span className="flex items-center gap-1 text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            +{totalElevationGainM}m gain
          </span>
          <span className="flex items-center gap-1 text-sky-400">
            <Mountain className="w-3.5 h-3.5" />
            {maxElevationM}m peak
          </span>
          {currentGrade >= 7 && (
            <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
              <AlertTriangle className="w-3 h-3" />
              {currentGrade.toFixed(1)}% climb
            </span>
          )}
        </div>
        <div className="text-[11px] opacity-75 font-mono">
          Current: {formatElevation(points[currentPointIndex]?.ele ?? 0)} | {formatDistance(points[currentPointIndex]?.distanceFromStart ?? 0)}
        </div>
      </div>

      {/* Interactive SVG Profile */}
      <div className="relative w-full h-[95px] px-2 pt-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full cursor-crosshair overflow-visible"
          onClick={(e) => {
            if (!onSelectPointIndex) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            const targetIdx = Math.round(ratio * (points.length - 1));
            onSelectPointIndex(targetIdx);
          }}
        >
          <defs>
            <linearGradient id="eleGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#0ea5e9" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="steepGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1={paddingTop} x2={width} y2={paddingTop} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
          <line x1="0" y1={height - paddingBottom} x2={width} y2={height - paddingBottom} stroke="currentColor" strokeOpacity="0.15" />

          {/* Area fill */}
          <path d={areaPath} fill="url(#eleGradient)" />

          {/* Elevation Stroke */}
          <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Highlight steep climb segments (>7.5% grade) in red */}
          {coords.map((c, i) => {
            if (c.point.grade >= 7.5 && i < coords.length - 1) {
              const nextC = coords[i + 1];
              return (
                <line
                  key={i}
                  x1={c.x.toFixed(1)}
                  y1={c.y.toFixed(1)}
                  x2={nextC.x.toFixed(1)}
                  y2={nextC.y.toFixed(1)}
                  stroke="#f43f5e"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              );
            }
            return null;
          })}

          {/* Current Rider Position Indicator */}
          <line
            x1={currentCoord.x}
            y1={paddingTop}
            x2={currentCoord.x}
            y2={height - paddingBottom}
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="3 3"
          />
          <circle
            cx={currentCoord.x}
            cy={currentCoord.y}
            r="6"
            fill="#38bdf8"
            stroke="#ffffff"
            strokeWidth="2.5"
            className="animate-pulse"
          />

          {/* Elevation labels */}
          <text x="6" y={paddingTop + 10} fontSize="11" fill="currentColor" opacity="0.6" fontFamily="sans-serif">
            {maxElevationM}m
          </text>
          <text x="6" y={height - paddingBottom - 4} fontSize="11" fill="currentColor" opacity="0.6" fontFamily="sans-serif">
            {minEle}m
          </text>
          <text x={width - 55} y={height - 5} fontSize="11" fill="currentColor" opacity="0.7" fontFamily="sans-serif">
            {totalDistanceKm} km
          </text>
        </svg>
      </div>
    </div>
  );
};
