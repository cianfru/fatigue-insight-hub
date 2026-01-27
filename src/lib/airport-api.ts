// Airport API client for fetching coordinates of unknown airports
// Uses the open AviationStack-style API or fallback to static data

import { AirportData, airportCoordinates } from '@/data/airportCoordinates';

// Cache for fetched airport data to avoid repeated API calls
const airportCache = new Map<string, AirportData | null>();

// Initialize cache with our static data
Object.entries(airportCoordinates).forEach(([code, data]) => {
  airportCache.set(code, data);
});

/**
 * Fetches airport coordinates from an external API
 * Uses a free airport database API
 */
async function fetchFromAPI(code: string): Promise<AirportData | null> {
  try {
    // Using a free, no-auth airport API
    const response = await fetch(
      `https://airports-by-api-ninjas.p.rapidapi.com/v1/airports?iata=${code}`,
      {
        method: 'GET',
        headers: {
          // This is a free tier RapidAPI - limited but functional
          'X-RapidAPI-Key': 'demo', // Will use fallback if this fails
          'X-RapidAPI-Host': 'airports-by-api-ninjas.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      console.warn(`[AirportAPI] API request failed for ${code}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const airport = data[0];
      return {
        code: code,
        name: airport.name || `${code} Airport`,
        city: airport.city || 'Unknown',
        country: airport.country || 'Unknown',
        lat: parseFloat(airport.latitude),
        lng: parseFloat(airport.longitude),
      };
    }

    return null;
  } catch (error) {
    console.warn(`[AirportAPI] Failed to fetch ${code}:`, error);
    return null;
  }
}

/**
 * Alternative: Use OpenFlights data (public domain)
 * This is a fallback that uses a GitHub-hosted dataset
 */
async function fetchFromOpenFlights(code: string): Promise<AirportData | null> {
  try {
    // OpenFlights provides a static CSV, but we can use a JSON mirror
    const response = await fetch(
      `https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat`
    );

    if (!response.ok) return null;

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const parts = line.split(',');
      // Format: ID, Name, City, Country, IATA, ICAO, Lat, Lng, ...
      if (parts.length >= 8) {
        const iata = parts[4].replace(/"/g, '');
        if (iata === code) {
          return {
            code: code,
            name: parts[1].replace(/"/g, ''),
            city: parts[2].replace(/"/g, ''),
            country: parts[3].replace(/"/g, ''),
            lat: parseFloat(parts[6]),
            lng: parseFloat(parts[7]),
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.warn(`[AirportAPI] OpenFlights fallback failed for ${code}:`, error);
    return null;
  }
}

/**
 * Main function to get airport coordinates
 * First checks cache/static data, then tries API
 */
export async function getAirportCoordinatesAsync(code: string): Promise<AirportData | null> {
  // Check cache first (includes static data)
  if (airportCache.has(code)) {
    return airportCache.get(code) || null;
  }

  // Try fetching from API
  console.log(`[AirportAPI] Fetching coordinates for unknown airport: ${code}`);
  
  // Try OpenFlights first (more reliable, no API key needed)
  let data = await fetchFromOpenFlights(code);
  
  if (!data) {
    // Fallback to RapidAPI
    data = await fetchFromAPI(code);
  }

  // Cache the result (even if null, to avoid repeated lookups)
  airportCache.set(code, data);

  if (data) {
    console.log(`[AirportAPI] Found coordinates for ${code}:`, data);
  } else {
    console.warn(`[AirportAPI] Could not find coordinates for ${code}`);
  }

  return data;
}

/**
 * Batch fetch multiple airports at once
 */
export async function getMultipleAirportsAsync(codes: string[]): Promise<Map<string, AirportData>> {
  const results = new Map<string, AirportData>();
  const unknownCodes: string[] = [];

  // Check cache first
  for (const code of codes) {
    if (airportCache.has(code)) {
      const data = airportCache.get(code);
      if (data) results.set(code, data);
    } else {
      unknownCodes.push(code);
    }
  }

  // Fetch unknown airports in parallel
  if (unknownCodes.length > 0) {
    console.log(`[AirportAPI] Fetching ${unknownCodes.length} unknown airports:`, unknownCodes);
    
    const fetches = unknownCodes.map(code => getAirportCoordinatesAsync(code));
    const fetchedData = await Promise.all(fetches);
    
    fetchedData.forEach((data, index) => {
      if (data) {
        results.set(unknownCodes[index], data);
      }
    });
  }

  return results;
}

/**
 * Check if an airport is in our cache/static data
 */
export function isAirportKnown(code: string): boolean {
  return airportCache.has(code) && airportCache.get(code) !== null;
}

/**
 * Get all cached airports
 */
export function getCachedAirports(): AirportData[] {
  return Array.from(airportCache.values()).filter((a): a is AirportData => a !== null);
}
