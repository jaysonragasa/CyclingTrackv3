export interface CyclingPlace {
  id: string;
  name: string;
  address: string;
  category: 'trail' | 'shop' | 'summit' | 'cafe' | 'hub' | 'station';
  bikeFacility: string;
  lat: number;
  lng: number;
  ele: number; // elevation in meters
  routeIdMatch?: string; // route preset it associates with
}

export const CYCLING_PLACES: CyclingPlace[] = [
  // Trails & Protected Cycleways
  {
    id: 'place-presidio-promenade',
    name: 'Presidio Promenade Bikeway',
    address: 'Lincoln Blvd & Montgomery St, San Francisco, CA',
    category: 'trail',
    bikeFacility: 'Protected Two-Way Cycle Track',
    lat: 37.8015,
    lng: -122.4650,
    ele: 15,
    routeIdMatch: 'route-marin-headlands'
  },
  {
    id: 'place-ggb-west',
    name: 'Golden Gate Bridge West Bike Path',
    address: 'Golden Gate Bridge West Sidewalk (Bicycles Only)',
    category: 'trail',
    bikeFacility: 'Dedicated Bicycle Path • Separated from Traffic',
    lat: 37.8180,
    lng: -122.4785,
    ele: 68,
    routeIdMatch: 'route-marin-headlands'
  },
  {
    id: 'place-embarcadero-greenway',
    name: 'Embarcadero Waterfront Greenway',
    address: 'The Embarcadero Promenade, San Francisco, CA',
    category: 'trail',
    bikeFacility: '100% Flat Protected Bike Superhighway',
    lat: 37.7955,
    lng: -122.3937,
    ele: 5,
    routeIdMatch: 'route-urban-greenway'
  },
  {
    id: 'place-mill-valley-path',
    name: 'Mill Valley-Sausalito Multi-Use Path',
    address: 'E Blithedale Ave & Camino Alto, Mill Valley, CA',
    category: 'trail',
    bikeFacility: 'Paved Rail-Trail • Zero Motor Traffic',
    lat: 37.8920,
    lng: -122.5250,
    ele: 10,
    routeIdMatch: 'route-multiday-pacific'
  },
  {
    id: 'place-coastal-trail-marin',
    name: 'Marin Headlands Coastal Trail',
    address: 'Bunker Rd & Coastal Trailhead, Sausalito, CA',
    category: 'trail',
    bikeFacility: 'Gravel & Paved Ocean Ridge Route',
    lat: 37.8280,
    lng: -122.5150,
    ele: 95,
    routeIdMatch: 'route-marin-headlands'
  },
  {
    id: 'place-great-highway',
    name: 'Great Highway Coastal Bikeway',
    address: 'Upper Great Highway Promenade, San Francisco, CA',
    category: 'trail',
    bikeFacility: 'Oceanfront Weekend Bike Park',
    lat: 37.7600,
    lng: -122.5090,
    ele: 8,
    routeIdMatch: 'route-urban-greenway'
  },

  // Summits & Category Climbs
  {
    id: 'place-hawk-hill',
    name: 'Hawk Hill Summit & Lookout',
    address: 'Conzelman Rd, Marin Headlands, CA',
    category: 'summit',
    bikeFacility: 'Category 3 Climb • 284m Peak • 11.2% Max Grade',
    lat: 37.8260,
    lng: -122.4995,
    ele: 284,
    routeIdMatch: 'route-marin-headlands'
  },
  {
    id: 'place-mt-tam',
    name: 'Mount Tamalpais East Peak Summit',
    address: 'Ridgecrest Blvd & Pan Toll Rd, Mill Valley, CA',
    category: 'summit',
    bikeFacility: 'Epic Alpine Ascent • 784m Summit • Seven Sisters',
    lat: 37.9235,
    lng: -122.5965,
    ele: 784,
    routeIdMatch: 'route-multiday-pacific'
  },
  {
    id: 'place-twin-peaks',
    name: 'Twin Peaks Scenic Overlook',
    address: '501 Twin Peaks Blvd, San Francisco, CA',
    category: 'summit',
    bikeFacility: 'City View Summit • 282m Elevation',
    lat: 37.7544,
    lng: -122.4477,
    ele: 282,
    routeIdMatch: 'route-marin-headlands'
  },
  {
    id: 'place-bohemia-pass',
    name: 'Bohemia Mountain Pass',
    address: 'Bohemian Hwy & Occidental Rd, Occidental, CA',
    category: 'summit',
    bikeFacility: 'Redwood Divide Climb • 260m Summit • 9.2% Grade',
    lat: 38.2200,
    lng: -122.9200,
    ele: 260,
    routeIdMatch: 'route-multiday-pacific'
  },

  // Bike Shops, Repair Stands & Public Pumps
  {
    id: 'place-presidio-cycle-works',
    name: 'Presidio Cycle Works & Repair',
    address: '101 Lincoln Blvd, San Francisco, CA',
    category: 'shop',
    bikeFacility: 'Full Repair Service • Hex Tools • Presta Floor Pump',
    lat: 37.8015,
    lng: -122.4650,
    ele: 15,
    routeIdMatch: 'route-marin-headlands'
  },
  {
    id: 'place-ggb-vista-tools',
    name: 'Golden Gate North Vista Tool Station',
    address: 'North Vista Point, Sausalito, CA',
    category: 'station',
    bikeFacility: 'Free 24/7 Public Tool Stand • Air Pump • Tire Levers',
    lat: 37.8324,
    lng: -122.4795,
    ele: 55,
    routeIdMatch: 'route-marin-headlands'
  },
  {
    id: 'place-sausalito-pump',
    name: 'Sausalito Waterfront Bike Pump & Fountain',
    address: 'Bridgeway & Tracy Way, Sausalito, CA',
    category: 'station',
    bikeFacility: 'Free Public Air Pump • Water Bottle Refill',
    lat: 37.8590,
    lng: -122.4855,
    ele: 8,
    routeIdMatch: 'route-marin-headlands'
  },
  {
    id: 'place-bodega-velo',
    name: 'Bodega Bay Velo Clinic & Assistance',
    address: '1580 Coast Hwy, Bodega Bay, CA',
    category: 'shop',
    bikeFacility: 'Touring Spares • Tubes • Emergency Repair',
    lat: 38.3330,
    lng: -123.0480,
    ele: 12,
    routeIdMatch: 'route-multiday-pacific'
  },
  {
    id: 'place-sports-basement-presidio',
    name: 'Sports Basement Presidio Bike Hub',
    address: '610 Old Mason St, San Francisco, CA',
    category: 'shop',
    bikeFacility: 'Bike Shop • Rental Fleet • Tune-ups • Parts',
    lat: 37.8040,
    lng: -122.4550,
    ele: 6,
    routeIdMatch: 'route-marin-headlands'
  },

  // Cafes & Tour Stopovers
  {
    id: 'place-presidio-hub',
    name: 'Presidio Bike Hub',
    address: 'Presidio Promenade & Lincoln Blvd, San Francisco, CA',
    category: 'hub',
    bikeFacility: 'Protected Bikeway Start • Bike Racks • Water',
    lat: 37.8015,
    lng: -122.4650,
    ele: 15,
    routeIdMatch: 'route-marin-headlands'
  },
  {
    id: 'place-sausalito-marina',
    name: 'Sausalito Marina Cafe',
    address: 'Bridgeway Waterfront & Anchor St, Sausalito, CA',
    category: 'cafe',
    bikeFacility: 'Waterfront Ride Finish • Outdoor Bike Parking • Bakery',
    lat: 37.8590,
    lng: -122.4855,
    ele: 8,
    routeIdMatch: 'route-marin-headlands'
  },
  {
    id: 'place-sausalito-ferry',
    name: 'Sausalito Ferry Terminal & Cafe',
    address: 'Humbolt Ave & Anchor St, Sausalito, CA',
    category: 'cafe',
    bikeFacility: 'Bike Racks • Ferry Transit • Coffee & Bakery',
    lat: 37.8590,
    lng: -122.4855,
    ele: 6,
    routeIdMatch: 'route-marin-headlands'
  },
  {
    id: 'place-equator-roundhouse',
    name: 'Equator Coffees Round House Cafe',
    address: 'Golden Gate Bridge South Plaza, San Francisco, CA',
    category: 'cafe',
    bikeFacility: 'Pre-Ride Espresso • Pastries • Hydration Stop',
    lat: 37.8080,
    lng: -122.4750,
    ele: 58,
    routeIdMatch: 'route-marin-headlands'
  },
  {
    id: 'place-olema-camp',
    name: 'Olema Campground & Bakery Stopover',
    address: '10155 CA-1, Olema, CA',
    category: 'cafe',
    bikeFacility: 'Bikepacking Campsite • Warm Showers • Lockers',
    lat: 38.0410,
    lng: -122.7880,
    ele: 45,
    routeIdMatch: 'route-multiday-pacific'
  },
  {
    id: 'place-ferry-building',
    name: 'Ferry Building Bike Station',
    address: '1 Ferry Building, San Francisco, CA',
    category: 'hub',
    bikeFacility: 'Secure Bike Parking • Farmers Market • Transit Hub',
    lat: 37.7955,
    lng: -122.3937,
    ele: 4,
    routeIdMatch: 'route-urban-greenway'
  },
  {
    id: 'place-fishermans-wharf',
    name: "Fisherman's Wharf Pier 39 Bike Hub",
    address: 'The Embarcadero & Beach St, San Francisco, CA',
    category: 'hub',
    bikeFacility: 'Bike Corridors • Restrooms • Water Stations',
    lat: 37.8100,
    lng: -122.4200,
    ele: 8,
    routeIdMatch: 'route-urban-greenway'
  }
];

/**
 * Searches cycling places with auto-suggest query matching.
 * Performs multi-term matching on name, address, category and facilities.
 */
export function searchCyclingPlaces(query: string, limit: number = 7): CyclingPlace[] {
  const clean = query.trim().toLowerCase();
  if (!clean) {
    return CYCLING_PLACES.slice(0, limit);
  }

  const terms = clean.split(/\s+/).filter(Boolean);

  const scored = CYCLING_PLACES.map(place => {
    const haystack = `${place.name} ${place.address} ${place.bikeFacility} ${place.category}`.toLowerCase();
    let score = 0;

    // Exact or prefix match on name
    if (place.name.toLowerCase() === clean) {
      score += 100;
    } else if (place.name.toLowerCase().startsWith(clean)) {
      score += 60;
    } else if (place.name.toLowerCase().includes(clean)) {
      score += 35;
    }

    // Term matches
    let matchedTermsCount = 0;
    for (const term of terms) {
      if (haystack.includes(term)) {
        matchedTermsCount++;
        score += 10;
      }
    }

    if (matchedTermsCount === terms.length && terms.length > 0) {
      score += 25;
    }

    return { place, score };
  });

  const matchingResults = scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.place)
    .slice(0, limit);

  // If user searched a custom query and no local cycling presets matched, return empty so live worldwide results take full priority
  return matchingResults;
}
