import React, { useState } from 'react';
import { CyclingRoute } from '../types/cycling';
import { OfflineStorageManager, OfflineMapPack } from '../utils/offlineStorage';
import { Download, HardDrive, Wifi, WifiOff, CheckCircle2, Trash2, X, RefreshCw } from 'lucide-react';

interface OfflineManagerModalProps {
  route: CyclingRoute;
  isOfflineMode: boolean;
  onToggleOfflineMode: (enabled: boolean) => void;
  onClose: () => void;
}

export const OfflineManagerModal: React.FC<OfflineManagerModalProps> = ({
  route,
  isOfflineMode,
  onToggleOfflineMode,
  onClose
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [offlinePacks, setOfflinePacks] = useState<OfflineMapPack[]>(OfflineStorageManager.getOfflinePacks());

  const isCurrentRouteSaved = OfflineStorageManager.isRouteSavedOffline(route.id);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadProgress(0);

    await OfflineStorageManager.saveRouteOffline(route, (pct) => {
      setDownloadProgress(pct);
    });

    setDownloading(false);
    setOfflinePacks(OfflineStorageManager.getOfflinePacks());
  };

  const handleRemove = (routeId: string) => {
    OfflineStorageManager.removeOfflinePack(routeId);
    setOfflinePacks(OfflineStorageManager.getOfflinePacks());
  };

  const totalStorageMb = OfflineStorageManager.getTotalCachedSizeMb();

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Offline Maps & Navigation</h2>
              <p className="text-xs text-zinc-400">Never get lost in remote mountain valleys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            aria-label="Close offline maps modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Offline Mode Toggle Banner */}
          <div className={`p-4 rounded-2xl border transition flex items-center justify-between ${
            isOfflineMode 
              ? 'bg-amber-500/10 border-amber-500/50 text-amber-200' 
              : 'bg-zinc-950 border-zinc-800'
          }`}>
            <div className="flex items-center gap-3">
              {isOfflineMode ? <WifiOff className="w-6 h-6 text-amber-400" /> : <Wifi className="w-6 h-6 text-emerald-400" />}
              <div>
                <div className="font-bold text-sm">
                  {isOfflineMode ? 'Offline Mode Active' : 'Online / Live GPS Mode'}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {isOfflineMode ? 'Relying exclusively on local cached map packs' : 'Streaming live map tiles and routing'}
                </div>
              </div>
            </div>

            <button
              onClick={() => onToggleOfflineMode(!isOfflineMode)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                isOfflineMode 
                  ? 'bg-amber-500 text-black hover:bg-amber-400' 
                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {isOfflineMode ? 'Go Online' : 'Simulate Offline'}
            </button>
          </div>

          {/* Current Route Download Card */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-500 block">CURRENT ROUTE</span>
                <span className="font-bold text-sm text-zinc-100">{route.name}</span>
                <span className="text-xs text-zinc-400 block mt-0.5 font-mono">
                  {route.totalDistanceKm} km • {route.points.length} GPS points
                </span>
              </div>

              {isCurrentRouteSaved ? (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved Offline</span>
                </div>
              ) : (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition"
                >
                  {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{downloading ? 'Downloading...' : 'Download Pack'}</span>
                </button>
              )}
            </div>

            {/* Progress bar when downloading */}
            {downloading && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-mono text-zinc-400">
                  <span>Caching vector tiles & offline turn cues...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Downloaded Packs List */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-zinc-400 font-semibold px-1">
              <span>Saved Map Packs ({offlinePacks.length})</span>
              <span className="font-mono">Storage: {totalStorageMb} MB</span>
            </div>

            {offlinePacks.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-xs bg-zinc-950/50 rounded-xl border border-dashed border-zinc-800">
                No offline map packs downloaded yet. Download the current route to navigate with no cell signal.
              </div>
            ) : (
              offlinePacks.map((pack) => (
                <div
                  key={pack.routeId}
                  className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-zinc-200">{pack.routeName}</h4>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {pack.tileCount} tiles cached • {pack.sizeMb} MB
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemove(pack.routeId)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 transition"
                    title="Delete offline pack"
                    aria-label={`Delete ${pack.routeName} offline pack`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
