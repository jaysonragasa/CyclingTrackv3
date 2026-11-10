import React, { useState } from 'react';
import { BikePOI, POIType } from '../types/cycling';
import { Wrench, Bike, HeartPulse, Droplet, Navigation, Phone, CheckCircle, X, ChevronRight } from 'lucide-react';
import { formatDistance } from '../utils/geo';

interface NearbyPOIsDrawerProps {
  pois: BikePOI[];
  currentLocationName?: string;
  onSelectPOI: (poi: BikePOI) => void;
  onDetourToPOI: (poi: BikePOI) => void;
  onClose: () => void;
}

export const NearbyPOIsDrawer: React.FC<NearbyPOIsDrawerProps> = ({
  pois,
  currentLocationName = 'Current Location',
  onSelectPOI,
  onDetourToPOI,
  onClose
}) => {
  const [filter, setFilter] = useState<POIType | 'all'>('all');

  const filteredPOIs = pois.filter(p => filter === 'all' || p.type === filter);

  const getIcon = (type: POIType) => {
    switch (type) {
      case 'bike_shop':
        return <Wrench className="w-4 h-4 text-blue-400" />;
      case 'repair_station':
        return <Wrench className="w-4 h-4 text-emerald-400" />;
      case 'bike_pump':
        return <Bike className="w-4 h-4 text-cyan-400" />;
      case 'water_refill':
        return <Droplet className="w-4 h-4 text-sky-400" />;
      case 'emergency_aid':
        return <HeartPulse className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[1200] w-full max-w-md bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl text-zinc-100">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-400" />
            <span>Bike Repair & Emergency Aid</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time stations near {currentLocationName}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          aria-label="Close bike shops drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="p-3 border-b border-zinc-800 flex items-center gap-1.5 overflow-x-auto text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
            filter === 'all' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          All ({pois.length})
        </button>
        <button
          onClick={() => setFilter('bike_shop')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
            filter === 'bike_shop' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          Shops
        </button>
        <button
          onClick={() => setFilter('repair_station')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
            filter === 'repair_station' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          Tool Stands
        </button>
        <button
          onClick={() => setFilter('bike_pump')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
            filter === 'bike_pump' ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          Pumps
        </button>
        <button
          onClick={() => setFilter('emergency_aid')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
            filter === 'emergency_aid' ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          Emergency
        </button>
      </div>

      {/* Station List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredPOIs.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            No bike repair facilities found for this category.
          </div>
        ) : (
          filteredPOIs.map((poi) => (
            <div
              key={poi.id}
              className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getIcon(poi.type)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 leading-snug">{poi.name}</h3>
                    {poi.address && <p className="text-xs text-zinc-400 mt-0.5">{poi.address}</p>}
                    
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {poi.hasTools && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          🛠️ Hex Tools & Levers
                        </span>
                      )}
                      {poi.hasPump && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          🚲 Floor Pump (Presta/Schrader)
                        </span>
                      )}
                      {poi.isOpen && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300">
                          Open Now
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {formatDistance(poi.distanceMeters ?? 0)}
                  </span>
                  <span className="block text-[10px] text-zinc-500">from route</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
                <button
                  onClick={() => {
                    onDetourToPOI(poi);
                    onClose();
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Detour to Station</span>
                </button>

                {poi.phone ? (
                  <a
                    href={`tel:${poi.phone}`}
                    className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                ) : (
                  <button
                    onClick={() => onSelectPOI(poi)}
                    className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition"
                  >
                    Locate
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
