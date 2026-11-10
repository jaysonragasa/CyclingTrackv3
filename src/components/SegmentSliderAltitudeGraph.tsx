import React from 'react';
import { RoutePoint } from '../types/cycling';
import { CustomSegment } from '../utils/cyclingEstimator';
import { Mountain, TrendingUp, Sliders } from 'lucide-react';
import { formatDistance, formatElevation } from '../utils/geo';

interface SegmentSliderAltitudeGraphProps {
  points: RoutePoint[];
  totalDistanceKm: number;
  totalElevationGainM: number;
  maxElevationM: number;
  splitPercentages: number[];
  onChangeSplits: (splits: number[]) => void;
  segments: CustomSegment[];
  isSunlightMode?: boolean;
}

export const SegmentSliderAltitudeGraph: React.FC<SegmentSliderAltitudeGraphProps> = ({
  points,
  totalDistanceKm,
  totalElevationGainM,
  maxElevationM,
  splitPercentages,
  onChangeSplits,
  segments,
  isSunlightMode = false
}) => {
  if (!points.length) return null;

  const elevations = points.map(p => p.ele ?? 0);
  const minEle = Math.max(0, Math.min(...elevations) - 10);
  const maxEle = Math.max(...elevations, 50);
  const eleRange = Math.max(1, maxEle - minEle);

  const width = 1000;
  const height = 150;
  const paddingBottom = 26;
  const paddingTop = 20;
  const chartHeight = height - paddingBottom - paddingTop;

  // Build SVG coordinates
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const normEle = ((p.ele ?? 0) - minEle) / eleRange;
    const y = height - paddingBottom - normEle * chartHeight;
    return { x, y, point: p, index: i };
  });

  const linePath = coords.reduce((acc, c, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`, '');
  const areaPath = `${linePath} L ${width} ${height - paddingBottom} L 0 ${height - paddingBottom} Z`;

  // Color palette for segments
  const segmentColors = [
    { text: 'text-emerald-400', bg: 'bg-emerald-500', fill: '#10b981', border: 'border-emerald-500' },
    { text: 'text-sky-400', bg: 'bg-sky-500', fill: '#0ea5e9', border: 'border-sky-500' },
    { text: 'text-amber-400', bg: 'bg-amber-500', fill: '#f59e0b', border: 'border-amber-500' },
    { text: 'text-purple-400', bg: 'bg-purple-500', fill: '#a855f7', border: 'border-purple-500' },
  ];

  // Boundaries: [0, ...splitPercentages, 100]
  const boundaries = [0, ...splitPercentages, 100];

  return (
    <div className={`rounded-2xl border p-3.5 space-y-3 transition-colors ${
      isSunlightMode
        ? 'bg-white border-zinc-300 text-zinc-900 shadow-sm'
        : 'bg-zinc-950/90 border-zinc-800 text-zinc-100 shadow-xl'
    }`}>
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-bold">
          <Mountain className="w-4 h-4 text-emerald-400" />
          <span>Altitude Graph & Segment Split Boundaries</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono opacity-80">
          <span className="text-emerald-400 font-bold">+{totalElevationGainM}m climbing</span>
          <span className="text-sky-400 font-bold">{maxElevationM}m peak</span>
          <span>{totalDistanceKm} km total</span>
        </div>
      </div>

      {/* SVG Altitude Profile with Mapped Split Lines */}
      <div className="relative w-full h-[145px] select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="plannerEleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1={paddingTop} x2={width} y2={paddingTop} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
          <line x1="0" y1={height - paddingBottom} x2={width} y2={height - paddingBottom} stroke="currentColor" strokeOpacity="0.15" />

          {/* Shaded Segment Bands */}
          {boundaries.slice(0, -1).map((startPct, idx) => {
            const endPct = boundaries[idx + 1];
            const startX = (startPct / 100) * width;
            const endX = (endPct / 100) * width;
            const bandWidth = endX - startX;
            const color = segmentColors[idx % segmentColors.length];

            return (
              <rect
                key={`band-${idx}`}
                x={startX}
                y={paddingTop}
                width={bandWidth}
                height={chartHeight}
                fill={color.fill}
                fillOpacity="0.08"
              />
            );
          })}

          {/* Base Area Fill & Elevation Stroke */}
          <path d={areaPath} fill="url(#plannerEleGrad)" />
          <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Highlight steep climb segments (>7.5%) */}
          {coords.map((c, i) => {
            if (c.point.grade >= 7.5 && i < coords.length - 1) {
              const nextC = coords[i + 1];
              return (
                <line
                  key={`steep-${i}`}
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

          {/* Mapped Segment Boundary Vertical Dividers & Markers */}
          {splitPercentages.map((pct, idx) => {
            const x = (pct / 100) * width;
            const color = segmentColors[(idx + 1) % segmentColors.length];
            const distM = (pct / 100) * (totalDistanceKm * 1000);

            return (
              <g key={`split-line-${idx}`}>
                {/* Vertical Divider Line */}
                <line
                  x1={x}
                  y1={paddingTop - 6}
                  x2={x}
                  y2={height - paddingBottom}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                  className="drop-shadow"
                />

                {/* Top Split Badge */}
                <rect
                  x={x - 38}
                  y={4}
                  width="76"
                  height="16"
                  rx="4"
                  fill="#18181b"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={16}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill="#ffffff"
                  fontFamily="monospace"
                >
                  Split {idx + 1}: {formatDistance(distM)}
                </text>
              </g>
            );
          })}

          {/* Elevation Labels */}
          <text x="6" y={paddingTop + 12} fontSize="11" fill="currentColor" opacity="0.6" fontFamily="sans-serif">
            {maxElevationM}m
          </text>
          <text x="6" y={height - paddingBottom - 4} fontSize="11" fill="currentColor" opacity="0.6" fontFamily="sans-serif">
            {minEle}m
          </text>
          <text x={width - 55} y={height - 8} fontSize="11" fill="currentColor" opacity="0.7" fontFamily="sans-serif">
            {totalDistanceKm} km
          </text>
        </svg>
      </div>

      {/* MAPPED SEGMENT SLIDERS */}
      <div className="space-y-3 pt-1 border-t border-inherit">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Drag Sliders to Adjust Segment Split Cutoffs</span>
          </span>
          <span className="font-mono text-[11px] text-sky-400">
            {splitPercentages.length + 1} Segments
          </span>
        </div>

        {/* Sliders for each split point */}
        <div className="space-y-2.5">
          {splitPercentages.map((pct, idx) => {
            const minAllowed = idx === 0 ? 8 : (splitPercentages[idx - 1] + 6);
            const maxAllowed = idx === splitPercentages.length - 1 ? 92 : (splitPercentages[idx + 1] - 6);
            const splitDistKm = ((pct / 100) * totalDistanceKm).toFixed(1);

            return (
              <div key={`slider-ctrl-${idx}`} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-zinc-200">
                    Split {idx + 1} Boundary (Seg {idx + 1} ↔ Seg {idx + 2})
                  </span>
                  <span className="font-mono text-emerald-400 font-bold text-xs">
                    {pct}% • {splitDistKm} km
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-500">{minAllowed}%</span>
                  <input
                    type="range"
                    min={minAllowed}
                    max={maxAllowed}
                    step={1}
                    value={pct}
                    onChange={(e) => {
                      const newPct = parseInt(e.target.value, 10);
                      const updated = [...splitPercentages];
                      updated[idx] = newPct;
                      onChangeSplits(updated);
                    }}
                    className="flex-1 accent-emerald-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
                    aria-label={`Adjust split boundary ${idx + 1}`}
                  />
                  <span className="text-[10px] font-mono text-zinc-500">{maxAllowed}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
