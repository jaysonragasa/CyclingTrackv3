import React, { useState } from 'react';
import { CyclingRoute } from '../types/cycling';
import { parseGPX, exportToGPX } from '../utils/gpx';
import { Upload, Download, FileCode, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

interface GPXModalProps {
  currentRoute: CyclingRoute;
  onImportRoute: (route: CyclingRoute) => void;
  onClose: () => void;
}

export const GPXModal: React.FC<GPXModalProps> = ({
  currentRoute,
  onImportRoute,
  onClose
}) => {
  const [importedRoute, setImportedRoute] = useState<CyclingRoute | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseGPX(text, file.name.replace(/\.gpx$/i, ''));
        if (parsed.points.length === 0) {
          setErrorMsg('No valid track points found in this GPX file.');
          return;
        }
        setImportedRoute(parsed);
        setSuccessMsg(`Successfully parsed ${parsed.points.length} track points and elevation profile!`);
      } catch (err: any) {
        setErrorMsg('Failed to parse GPX XML. Please ensure it is a valid GPX 1.0 or 1.1 file.');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const gpxText = exportToGPX(currentRoute.name, currentRoute.points, currentRoute.waypoints);
    const blob = new Blob([gpxText], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentRoute.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_velonav.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSuccessMsg('GPX route exported successfully for desktop analysis!');
  };

  const handleApplyImport = () => {
    if (importedRoute) {
      onImportRoute(importedRoute);
      onClose();
    }
  };

  // Sample Strava/Komoot preset sync simulation
  const handleLoadSampleStrava = () => {
    const sampleGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Strava GPX">
  <metadata><name>Alpine Vista Gravel Gran Fondo</name></metadata>
  <trk>
    <name>Alpine Vista Gravel Gran Fondo</name>
    <trkseg>
      <trkpt lat="37.8100" lon="-122.4500"><ele>20.0</ele></trkpt>
      <trkpt lat="37.8200" lon="-122.4600"><ele>75.0</ele></trkpt>
      <trkpt lat="37.8350" lon="-122.4800"><ele>190.0</ele></trkpt>
      <trkpt lat="37.8450" lon="-122.5000"><ele>290.0</ele></trkpt>
      <trkpt lat="37.8600" lon="-122.5100"><ele>140.0</ele></trkpt>
      <trkpt lat="37.8750" lon="-122.5200"><ele>35.0</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;
    const parsed = parseGPX(sampleGPX);
    setImportedRoute(parsed);
    setSuccessMsg('Sample Strava Gran Fondo loaded! Click Apply to ride this route.');
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">GPX Route Sync & Export</h2>
              <p className="text-xs text-zinc-400">Compatible with Strava, Komoot & Garmin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            aria-label="Close GPX dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Status feedback */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Import Section */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            <span className="text-xs font-bold text-zinc-300 block">Import Route (.gpx)</span>
            <p className="text-xs text-zinc-400">
              Upload a GPX track from Strava, Komoot, or RideWithGPS to load turn cues and elevation profiles.
            </p>

            <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-emerald-500 bg-zinc-900/60 cursor-pointer transition">
              <Upload className="w-6 h-6 text-emerald-400 mb-2" />
              <span className="text-xs font-bold text-zinc-200">Click to choose GPX file</span>
              <span className="text-[11px] text-zinc-500 mt-0.5">Supports .gpx (Tracks & Waypoints)</span>
              <input
                type="file"
                accept=".gpx,application/gpx+xml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Quick Preset Demo */}
            <button
              onClick={handleLoadSampleStrava}
              className="w-full py-2 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 flex items-center justify-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Sample Strava Gran Fondo GPX</span>
            </button>

            {/* Preview of Imported Route */}
            {importedRoute && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-300">{importedRoute.name}</span>
                  <span className="font-mono text-zinc-400">{importedRoute.totalDistanceKm} km</span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono flex gap-3">
                  <span>+{importedRoute.totalElevationGainM}m gain</span>
                  <span>{importedRoute.points.length} coordinates</span>
                </div>
                <button
                  onClick={handleApplyImport}
                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs transition"
                >
                  Activate Imported Route Now
                </button>
              </div>
            )}
          </div>

          {/* Export Section */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5">
            <span className="text-xs font-bold text-zinc-300 block">Export Active Route for Desktop</span>
            <p className="text-xs text-zinc-400">
              Download your route with full elevation, timestamps, and waypoints for post-ride analysis in TrainingPeaks, GoldenCheetah, or Strava.
            </p>

            <button
              onClick={handleExport}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download "{currentRoute.name}" as GPX</span>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
