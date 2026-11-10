import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CyclingRoute, BikePOI, RoutePoint, Waypoint, HazardAlert } from '../types/cycling';

// Fix default Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export type MapTileTheme = 'cyclosm' | 'dark' | 'sunlight' | 'osm';

interface MapProps {
  route: CyclingRoute;
  currentPoint: RoutePoint;
  currentBearing: number;
  isHeadingUp: boolean;
  tileTheme: MapTileTheme;
  pois: BikePOI[];
  showPOIs: boolean;
  onSelectPOI: (poi: BikePOI) => void;
  onAddWaypointAtCoord?: (lat: number, lng: number) => void;
}

export const Map: React.FC<MapProps> = ({
  route,
  currentPoint,
  currentBearing,
  isHeadingUp,
  tileTheme,
  pois,
  showPOIs,
  onSelectPOI,
  onAddWaypointAtCoord
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const poiLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const cyclistMarkerRef = useRef<L.Marker | null>(null);
  const cyclistElementRef = useRef<HTMLDivElement | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: L.LatLngTuple = route.points[0] ? [route.points[0].lat, route.points[0].lng] : [37.8015, -122.4650];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    // Custom zoom control in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Context menu / click to add waypoint
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onAddWaypointAtCoord) {
        onAddWaypointAtCoord(e.latlng.lat, e.latlng.lng);
      }
    });

    const routeGroup = L.layerGroup().addTo(map);
    const poiGroup = L.layerGroup().addTo(map);

    routeLayerGroupRef.current = routeGroup;
    poiLayerGroupRef.current = poiGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer based on theme
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let tileUrl = '';
    let maxZoom = 19;
    let attribution = '&copy; OpenStreetMap contributors';

    switch (tileTheme) {
      case 'cyclosm':
        // CyclOSM dedicated bicycle infrastructure layer
        tileUrl = 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png';
        maxZoom = 18;
        break;
      case 'dark':
        // Reliable fast dark tiles
        tileUrl = 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png';
        break;
      case 'sunlight':
        // High contrast sunlight tiles
        tileUrl = 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png';
        break;
      case 'osm':
      default:
        tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        break;
    }

    const newLayer = L.tileLayer(tileUrl, {
      maxZoom,
      subdomains: 'abc',
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [tileTheme]);

  // Render Route Polyline colored by gradient and Waypoints
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = routeLayerGroupRef.current;
    if (!map || !group || !route.points.length) return;

    group.clearLayers();

    // Render route polylines colored by grade
    const points = route.points;
    const segments: { latlngs: [number, number][]; color: string; weight: number }[] = [];

    let currentSegment: [number, number][] = [[points[0].lat, points[0].lng]];
    let currentColor = getGradeColor(points[0].grade);

    for (let i = 1; i < points.length; i++) {
      const pt = points[i];
      const color = getGradeColor(pt.grade);
      currentSegment.push([pt.lat, pt.lng]);

      if (color !== currentColor || i === points.length - 1) {
        segments.push({
          latlngs: currentSegment,
          color: currentColor,
          weight: 6
        });
        currentSegment = [[pt.lat, pt.lng]];
        currentColor = color;
      }
    }

    // Add outline shadow for better visibility in any map theme
    const allCoords: [number, number][] = points.map(p => [p.lat, p.lng]);
    L.polyline(allCoords, {
      color: '#000000',
      weight: 9,
      opacity: 0.45,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(group);

    // Add colored gradient segments
    segments.forEach(seg => {
      L.polyline(seg.latlngs, {
        color: seg.color,
        weight: seg.weight,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(group);
    });

    // Render Waypoints & Stopover markers
    route.waypoints.forEach((wpt, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === route.waypoints.length - 1;
      const isStop = wpt.isStopover;

      const markerHtml = `
        <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 border-white text-xs font-black transition-transform hover:scale-110 ${
          isStart ? 'bg-emerald-500 text-white' :
          isEnd ? 'bg-amber-500 text-white' :
          isStop ? 'bg-indigo-600 text-white' : 'bg-sky-500 text-white'
        }">
          ${isStart ? 'S' : isEnd ? '🏁' : isStop ? (wpt.stopoverType === 'camp' ? '⛺' : wpt.stopoverType === 'hotel' ? '🏨' : '☕') : idx + 1}
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-waypoint-icon',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([wpt.lat, wpt.lng], { icon }).addTo(group);
      marker.bindPopup(`
        <div class="text-zinc-900 p-1 min-w-[180px]">
          <div class="font-bold text-sm">${wpt.name}</div>
          ${wpt.dayNumber ? `<div class="text-xs text-sky-600 font-semibold">Stage Day ${wpt.dayNumber}</div>` : ''}
          ${wpt.notes ? `<div class="text-xs mt-1 text-zinc-600">${wpt.notes}</div>` : ''}
        </div>
      `);
    });

    // Render Hazard alerts (Steep climb, construction, weather)
    route.hazards.forEach(hazard => {
      const hazardColor = hazard.severity === 'danger' ? 'bg-rose-600' : 'bg-amber-500';
      const hazardEmoji = hazard.type === 'steep_climb' ? '⛰️' : hazard.type === 'construction' ? '🚧' : '🌪️';

      const hazardHtml = `
        <div class="flex items-center justify-center w-7 h-7 rounded-lg shadow-md border border-white text-xs ${hazardColor} text-white animate-pulse">
          ${hazardEmoji}
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-hazard-icon',
        html: hazardHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([hazard.lat, hazard.lng], { icon }).addTo(group);
      marker.bindPopup(`
        <div class="text-zinc-900 p-1">
          <div class="font-black text-rose-600 text-xs uppercase tracking-wide">Alert Ahead</div>
          <div class="font-bold text-sm">${hazard.title}</div>
          <div class="text-xs text-zinc-600 mt-1">${hazard.description}</div>
          ${hazard.gradient ? `<div class="text-xs font-mono font-bold text-rose-600 mt-1">Grade: +${hazard.gradient}%</div>` : ''}
        </div>
      `);
    });

    // Initial fit bounds if valid
    if (allCoords.length > 1) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [60, 60], maxZoom: 15 });
    }
  }, [route]);

  // Render Bike POIs (Repair stations, shops, pumps, emergency aid)
  useEffect(() => {
    const group = poiLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();
    if (!showPOIs) return;

    pois.forEach(poi => {
      const iconDetails = getPOIIconDetails(poi.type);
      const poiHtml = `
        <div class="flex items-center justify-center w-7 h-7 rounded-full shadow-lg border-2 border-white text-xs font-bold text-white ${iconDetails.bg} transition-transform hover:scale-125 cursor-pointer">
          ${iconDetails.symbol}
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-poi-icon',
        html: poiHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([poi.lat, poi.lng], { icon }).addTo(group);
      marker.on('click', () => {
        onSelectPOI(poi);
      });

      marker.bindPopup(`
        <div class="text-zinc-900 p-1.5 min-w-[200px]">
          <div class="text-[10px] font-bold uppercase tracking-wider text-sky-600">${iconDetails.label}</div>
          <div class="font-bold text-sm leading-tight">${poi.name}</div>
          ${poi.address ? `<div class="text-xs text-zinc-500 mt-0.5">${poi.address}</div>` : ''}
          <div class="flex items-center gap-2 mt-2 text-xs font-semibold">
            ${poi.hasTools ? '<span class="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">🛠️ Tools Available</span>' : ''}
            ${poi.hasPump ? '<span class="text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">🚲 Pump Free</span>' : ''}
          </div>
          ${poi.distanceMeters ? `<div class="text-xs text-zinc-600 mt-1 font-mono">${(poi.distanceMeters / 1000).toFixed(1)} km from your bike</div>` : ''}
        </div>
      `);
    });
  }, [pois, showPOIs]);

  // Render & Update Cyclist Location Puck with Heading Arrow
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentPoint) return;

    if (!cyclistMarkerRef.current) {
      const puckDiv = document.createElement('div');
      cyclistElementRef.current = puckDiv;
      puckDiv.className = 'cyclist-beacon';
      puckDiv.innerHTML = `
        <div class="relative flex items-center justify-center w-11 h-11">
          <div class="absolute inset-0 rounded-full bg-sky-500/30 animate-ping"></div>
          <div class="relative w-8 h-8 rounded-full bg-sky-500 border-2 border-white shadow-xl flex items-center justify-center text-white">
            <svg id="cyclist-heading-arrow" class="w-5 h-5 fill-current transition-transform duration-150" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'cyclist-puck-container',
        html: puckDiv,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      cyclistMarkerRef.current = L.marker([currentPoint.lat, currentPoint.lng], {
        icon,
        zIndexOffset: 1000
      }).addTo(map);
    } else {
      cyclistMarkerRef.current.setLatLng([currentPoint.lat, currentPoint.lng]);
    }

    // Rotate arrow inside puck
    const arrow = document.getElementById('cyclist-heading-arrow');
    if (arrow) {
      // If heading up, arrow points straight up, else points towards bearing
      const arrowRotation = isHeadingUp ? 0 : currentBearing;
      arrow.style.transform = `rotate(${arrowRotation}deg)`;
    }

    // Keep map centered on cyclist during active navigation
    map.panTo([currentPoint.lat, currentPoint.lng], { animate: true, duration: 0.4 });
  }, [currentPoint, currentBearing, isHeadingUp]);

  // Auto-Rotation (Heading Up) transform
  // Rotates the outer map canvas smoothly so current travel direction is oriented upwards
  const mapRotationStyle = isHeadingUp
    ? {
        transform: `rotate(${-currentBearing}deg)`,
        transformOrigin: 'center center',
        transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
      }
    : {
        transform: 'rotate(0deg)',
        transformOrigin: 'center center',
        transition: 'transform 0.4s ease-out'
      };

  return (
    <div className="relative w-full h-full overflow-hidden bg-zinc-950">
      {/* Auto-rotating Map Container Wrapper */}
      <div
        className="absolute inset-[-35%] w-[170%] h-[170%]"
        style={mapRotationStyle}
      >
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};

// Helper: Grade color calculation
function getGradeColor(grade: number): string {
  if (grade >= 8.0) return '#f43f5e'; // Crimson / Red for steep climbs (>8%)
  if (grade >= 4.0) return '#f59e0b'; // Amber / Orange for moderate climbs (4-8%)
  if (grade <= -4.0) return '#06b6d4'; // Cyan for steep descent
  return '#10b981'; // Emerald Green for flat / gentle bike paths
}

// Helper: POI icon styling
function getPOIIconDetails(type: string): { symbol: string; bg: string; label: string } {
  switch (type) {
    case 'bike_shop':
      return { symbol: '🔧', bg: 'bg-blue-600', label: 'Bike Shop & Service' };
    case 'repair_station':
      return { symbol: '🛠️', bg: 'bg-emerald-600', label: 'Self-Service Station' };
    case 'bike_pump':
      return { symbol: '🚲', bg: 'bg-cyan-600', label: 'Public Bike Pump' };
    case 'water_refill':
      return { symbol: '💧', bg: 'bg-sky-500', label: 'Water Refill' };
    case 'emergency_aid':
      return { symbol: '🚑', bg: 'bg-rose-600', label: 'Emergency First Aid' };
    default:
      return { symbol: '🚲', bg: 'bg-zinc-700', label: 'Bike Facility' };
  }
}
