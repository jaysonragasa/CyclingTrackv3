import { CyclingPlace } from '../data/cyclingPlaces';

export interface GeocodedAddress {
  id: string;
  name: string;
  address: string;
  category: 'trail' | 'shop' | 'summit' | 'cafe' | 'hub' | 'station';
  bikeFacility: string;
  lat: number;
  lng: number;
  ele: number;
}

/**
 * Checks if a string contains raw GPS coordinates like "14.5547, 121.0244" or "37.8015 -122.4650".
 */
export function parseRawCoordinates(query: string): { lat: number; lng: number } | null {
  const match = query.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[3]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

/**
 * Searches worldwide addresses, bike paths, summits and landmarks
 * using live Komoot Photon (OpenStreetMap data) with fallback to Nominatim.
 */
export async function searchRealAddresses(query: string, limit: number = 7): Promise<GeocodedAddress[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) {
    return [];
  }

  // Check if user entered direct GPS coordinates
  const rawCoords = parseRawCoordinates(clean);
  if (rawCoords) {
    return [{
      id: `coord-${Date.now()}`,
      name: `${rawCoords.lat.toFixed(5)}, ${rawCoords.lng.toFixed(5)}`,
      address: `Custom GPS Coordinates (${rawCoords.lat.toFixed(5)}, ${rawCoords.lng.toFixed(5)})`,
      category: 'hub',
      bikeFacility: 'Custom GPS Waypoint',
      lat: rawCoords.lat,
      lng: rawCoords.lng,
      ele: 20
    }];
  }

  const results: GeocodedAddress[] = [];

  // Try Komoot Photon first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const encoded = encodeURIComponent(clean);
    const url = `https://photon.komoot.io/api/?q=${encoded}&limit=${limit}`;
    const res = await fetch(url, { 
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        data.features.forEach((f: any, idx: number) => {
          const props = f.properties || {};
          const coords = f.geometry?.coordinates || [0, 0];
          const lng = coords[0];
          const lat = coords[1];

          const name = props.name || props.street || props.city || clean;
          const addressParts = [
            props.housenumber && props.street ? `${props.housenumber} ${props.street}` : props.street,
            props.district,
            props.city,
            props.state,
            props.country
          ].filter(Boolean);

          const fullAddress = addressParts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

          let category: GeocodedAddress['category'] = 'hub';
          let facility = 'Public Cycle Access';

          const osmValue = (props.osm_value || '').toLowerCase();
          const osmKey = (props.osm_key || '').toLowerCase();

          if (osmValue.includes('cycleway') || osmValue.includes('path') || osmKey === 'highway') {
            category = 'trail';
            facility = 'Designated Cycle Infrastructure';
          } else if (osmValue.includes('peak') || osmValue.includes('mountain') || osmValue.includes('hill')) {
            category = 'summit';
            facility = 'Scenic Elevation Lookout';
          } else if (osmValue.includes('bicycle') || osmValue.includes('shop')) {
            category = 'shop';
            facility = 'Bike Shop & Service';
          } else if (osmValue.includes('cafe') || osmValue.includes('restaurant')) {
            category = 'cafe';
            facility = 'Cyclist Stopover & Refreshments';
          }

          results.push({
            id: `real-${props.osm_id || idx}-${Date.now()}`,
            name,
            address: fullAddress,
            category,
            bikeFacility: facility,
            lat,
            lng,
            ele: Math.round(20 + Math.abs(Math.sin(lat * 10)) * 120)
          });
        });
      }
    }
  } catch (err) {
    // Photon timed out or failed, will try Nominatim fallback
  }

  if (results.length > 0) {
    return results.slice(0, limit);
  }

  // Fallback to OSM Nominatim if Photon yielded nothing
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean)}&limit=${limit}&addressdetails=1`;
    const res = await fetch(nomUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VeloNav-Cycling-App/1.0'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        return list.map((item: any, idx: number) => ({
          id: `nom-${item.place_id || idx}`,
          name: item.name || item.display_name.split(',')[0],
          address: item.display_name,
          category: 'hub' as const,
          bikeFacility: 'Cycle-Accessible Waypoint',
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          ele: 25
        })).slice(0, limit);
      }
    }
  } catch {
    // Both failed
  }

  return [];
}

/**
 * Geocodes a single address string to a coordinate object.
 * Returns null if no match found.
 */
export async function geocodeAddressSingle(query: string): Promise<GeocodedAddress | null> {
  const clean = query.trim();
  if (!clean) return null;

  const rawCoords = parseRawCoordinates(clean);
  if (rawCoords) {
    return {
      id: `coord-${Date.now()}`,
      name: `${rawCoords.lat.toFixed(5)}, ${rawCoords.lng.toFixed(5)}`,
      address: `Coordinates: ${rawCoords.lat.toFixed(5)}, ${rawCoords.lng.toFixed(5)}`,
      category: 'hub',
      bikeFacility: 'Custom GPS Point',
      lat: rawCoords.lat,
      lng: rawCoords.lng,
      ele: 20
    };
  }

  const results = await searchRealAddresses(clean, 3);
  if (results && results.length > 0) {
    return results[0];
  }

  return null;
}
