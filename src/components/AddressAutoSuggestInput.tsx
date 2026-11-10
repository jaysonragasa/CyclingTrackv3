import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CyclingPlace, searchCyclingPlaces } from '../data/cyclingPlaces';
import { searchRealAddresses, geocodeAddressSingle, GeocodedAddress } from '../services/geocodingService';
import { 
  MapPin, 
  Flag, 
  Bike, 
  Mountain, 
  Wrench, 
  Coffee, 
  Navigation, 
  Crosshair, 
  X, 
  Check,
  Globe,
  Loader2,
  Search,
  ArrowRight
} from 'lucide-react';

interface AddressAutoSuggestInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelectPlace?: (place: CyclingPlace | GeocodedAddress) => void;
  placeholder?: string;
  isOrigin?: boolean;
  isSunlightMode?: boolean;
  onUseCurrentLocation?: () => void;
}

export const AddressAutoSuggestInput: React.FC<AddressAutoSuggestInputProps> = ({
  label,
  value,
  onChange,
  onSelectPlace,
  placeholder = 'Type your address, street, city or trailhead...',
  isOrigin = true,
  isSunlightMode = false,
  onUseCurrentLocation
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [liveResults, setLiveResults] = useState<GeocodedAddress[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [isResolvingDirect, setIsResolvingDirect] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Local preset matches (only if user query actually matches a preset, otherwise empty)
  const localSuggestions = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      // Empty input: show top 4 preset hubs
      return searchCyclingPlaces('', 4);
    }
    // Non-empty: only return if query explicitly matches preset name/address
    return searchCyclingPlaces(trimmed, 3);
  }, [value]);

  // Debounced live worldwide OpenStreetMap / Komoot Photon geocoding
  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setLiveResults([]);
      setIsSearchingLive(false);
      return;
    }

    setIsSearchingLive(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchRealAddresses(trimmed, 6);
        setLiveResults(results);
      } catch {
        setLiveResults([]);
      } finally {
        setIsSearchingLive(false);
      }
    }, 180); // Fast 180ms debounce

    return () => clearTimeout(timer);
  }, [value]);

  // PRIORITIZE LIVE WORLDWIDE RESULTS OVER PRESETS
  const allSuggestions = useMemo(() => {
    const trimmed = value.trim();
    const seenNames = new Set<string>();
    const list: (CyclingPlace | (GeocodedAddress & { isLive?: boolean }))[] = [];

    // 1. Live Worldwide Results First when searching
    if (trimmed.length >= 2) {
      liveResults.forEach(r => {
        const key = `${r.name.toLowerCase()}-${r.lat.toFixed(3)}`;
        if (!seenNames.has(key)) {
          seenNames.add(key);
          list.push({ ...r, isLive: true });
        }
      });
    }

    // 2. Local Presets (only if they matched the query or input is empty)
    localSuggestions.forEach(p => {
      const key = `${p.name.toLowerCase()}-${p.lat.toFixed(3)}`;
      if (!seenNames.has(key)) {
        seenNames.add(key);
        list.push(p);
      }
    });

    return list.slice(0, 8);
  }, [value, liveResults, localSuggestions]);

  // Click outside listener to dismiss suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (place: CyclingPlace | GeocodedAddress) => {
    onChange(place.name);
    setIsOpen(false);
    if (onSelectPlace) {
      onSelectPlace(place);
    }
  };

  // Immediate geocode for user-typed address
  const handleDirectGeocode = async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean) return;

    setIsResolvingDirect(true);
    try {
      const resolved = await geocodeAddressSingle(clean);
      if (resolved) {
        handleSelect(resolved);
      } else {
        // Fallback: create arbitrary point or alert
        setIsOpen(false);
      }
    } catch (err) {
      console.warn('Direct geocoding error:', err);
    } finally {
      setIsResolvingDirect(false);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isOpen) {
        handleDirectGeocode(value);
        return;
      }

      if (highlightedIndex >= 0 && highlightedIndex < allSuggestions.length) {
        handleSelect(allSuggestions[highlightedIndex]);
      } else if (allSuggestions.length > 0) {
        handleSelect(allSuggestions[0]);
      } else {
        handleDirectGeocode(value);
      }
      return;
    }

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < allSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : allSuggestions.length - 1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case 'summit':
        return <Mountain className="w-3.5 h-3.5 text-amber-400" />;
      case 'shop':
      case 'station':
        return <Wrench className="w-3.5 h-3.5 text-sky-400" />;
      case 'cafe':
        return <Coffee className="w-3.5 h-3.5 text-emerald-400" />;
      case 'trail':
      default:
        return <Bike className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-black uppercase tracking-wider opacity-60 flex items-center gap-1">
          {isOrigin ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
          )}
          <span>{label}</span>
        </label>

        {isOrigin && onUseCurrentLocation && (
          <button
            type="button"
            onClick={onUseCurrentLocation}
            className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition cursor-pointer"
          >
            <Crosshair className="w-3 h-3" />
            <span>Use Current GPS</span>
          </button>
        )}
      </div>

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={(e) => {
            setIsOpen(true);
            e.target.select();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={label}
          aria-expanded={isOpen}
          role="combobox"
          aria-autocomplete="list"
          className={`w-full rounded-xl px-3 py-2 pr-16 text-xs sm:text-sm font-semibold transition border ${
            isSunlightMode
              ? 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:border-emerald-600 focus:bg-white'
              : 'bg-zinc-900/80 border-zinc-700/80 text-zinc-100 focus:border-emerald-500 focus:bg-zinc-900'
          } focus:outline-none`}
        />

        <div className="absolute right-2.5 flex items-center gap-1.5">
          {isSearchingLive || isResolvingDirect ? (
            <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
          ) : (
            value.trim().length >= 2 && (
              <button
                type="button"
                onClick={() => handleDirectGeocode(value)}
                title="Search this address globally"
                className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black transition cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )
          )}

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setLiveResults([]);
                inputRef.current?.focus();
              }}
              className="p-1 text-zinc-400 hover:text-white transition cursor-pointer"
              aria-label={`Clear ${label}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Auto-Suggest Dropdown */}
      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-1.5 z-[1300] rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 ${
          isSunlightMode
            ? 'bg-white/95 border-zinc-300 text-zinc-900 ring-2 ring-black/5'
            : 'bg-zinc-900/98 border-zinc-700/90 text-zinc-100 ring-1 ring-white/10'
        }`}>
          {/* Quick GPS Location Suggestion (Origin Only) */}
          {isOrigin && onUseCurrentLocation && (
            <button
              type="button"
              onClick={() => {
                onUseCurrentLocation();
                setIsOpen(false);
              }}
              className="w-full text-left px-3.5 py-2.5 border-b border-inherit bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5 text-xs font-bold">
                <Crosshair className="w-4 h-4 text-sky-400 animate-pulse" />
                <span>My Current Location (GPS)</span>
              </div>
              <span className="text-[10px] font-mono text-sky-400/80">Live GPS</span>
            </button>
          )}

          {/* Quick Direct Geocode Action for Typed Address */}
          {value.trim().length >= 2 && (
            <button
              type="button"
              onClick={() => handleDirectGeocode(value)}
              className="w-full text-left px-3.5 py-2 border-b border-inherit bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-xs font-bold truncate">
                  Use exact address: &ldquo;{value.trim()}&rdquo;
                </span>
              </div>
              <span className="text-[10px] font-semibold flex items-center gap-1 text-emerald-400/90 flex-shrink-0">
                Geocode & Route <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          )}

          {/* Live Searching Indicator */}
          {isSearchingLive && (
            <div className="px-3.5 py-2 text-[11px] text-sky-400 flex items-center gap-2 border-b border-inherit bg-sky-500/5">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Searching live OpenStreetMap worldwide for &ldquo;{value}&rdquo;...</span>
            </div>
          )}

          {/* Suggestions List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-inherit">
            {allSuggestions.length === 0 ? (
              <div className="p-4 text-center text-xs opacity-60">
                {isSearchingLive 
                  ? 'Searching worldwide cycling map...' 
                  : (
                    <div className="space-y-1">
                      <div>No immediate matches found for &ldquo;{value}&rdquo;.</div>
                      <button
                        type="button"
                        onClick={() => handleDirectGeocode(value)}
                        className="text-emerald-400 font-bold hover:underline cursor-pointer"
                      >
                        Click here to search global OpenStreetMap for this exact address
                      </button>
                    </div>
                  )}
              </div>
            ) : (
              allSuggestions.map((place, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const isSelected = value.toLowerCase() === place.name.toLowerCase();
                const isLiveOSM = (place as any).isLive;

                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => handleSelect(place)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 transition flex items-start justify-between gap-2.5 cursor-pointer ${
                      isHighlighted
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : isSelected
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        {isLiveOSM ? (
                          <Globe className="w-3.5 h-3.5 text-sky-400" />
                        ) : (
                          renderCategoryIcon(place.category)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          <span>{place.name}</span>
                          {isLiveOSM ? (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                              OSM Live
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-zinc-700/60 text-zinc-300">
                              Preset Hub
                            </span>
                          )}
                          {place.ele > 150 && (
                            <span className="text-[10px] font-mono text-amber-400 font-semibold">
                              {place.ele}m peak
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] opacity-70 truncate font-normal mt-0.5">
                          {place.address}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-400/90 truncate mt-0.5">
                          {place.bikeFacility}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
