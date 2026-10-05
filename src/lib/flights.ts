import {
    Flight,
    FlightAirport,
    AviationStackResponse,
    AviationStackFlight,
    FlightStatus,
} from '@/types';
import {
    getOpenSkyState,
    getOpenSkyTrack,
    isValidCoordinate,
} from '@/lib/opensky';
import { parse } from 'csv-parse/sync';

// Build a date string for today in YYYY-MM-DD format (server-side, UTC)
function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

function tomorrowStr(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
}

// -----------------------------------------------------------------------------
// MOCK DATA
// -----------------------------------------------------------------------------

const MOCK_FLIGHTS: Flight[] = [
    // 1. Standard flight
    {
        id: 'f1',
        airline: 'American Airlines',
        flightNumber: 'AA123',
        departure: {
            city: 'New York',
            airportCode: 'JFK',
            timeLocal: `${todayStr()}T08:00:00`,
            timezone: 'America/New_York',
            scheduled: `${todayStr()}T08:00:00`,
            terminal: '8',
            gate: 'B22',
        },
        arrival: {
            city: 'Los Angeles',
            airportCode: 'LAX',
            timeLocal: `${todayStr()}T11:15:00`,
            timezone: 'America/Los_Angeles',
            scheduled: `${todayStr()}T11:15:00`,
            terminal: '4',
            gate: '42A',
            baggage: '5',
        },
        status: 'On Time',
        aircraft: 'B738',
        live: null,
    },

    // 2. Flight crossing midnight
    {
        id: 'f2',
        airline: 'United Airlines',
        flightNumber: 'UA456',
        departure: {
            city: 'Los Angeles',
            airportCode: 'LAX',
            timeLocal: `${todayStr()}T23:30:00`,
            timezone: 'America/Los_Angeles',
            scheduled: `${todayStr()}T23:30:00`,
            terminal: '7',
            gate: '75B',
        },
        arrival: {
            city: 'Chicago',
            airportCode: 'ORD',
            timeLocal: `${tomorrowStr()}T05:30:00`,
            timezone: 'America/Chicago',
            scheduled: `${tomorrowStr()}T05:30:00`,
            terminal: '1',
            gate: 'C18',
            baggage: '3',
        },
        status: 'On Time',
        aircraft: 'B739',
        live: null,
    },

    // 3. International dateline flight
    {
        id: 'f3',
        airline: 'Japan Airlines',
        flightNumber: 'JL001',
        departure: {
            city: 'San Francisco',
            airportCode: 'SFO',
            timeLocal: `${todayStr()}T13:00:00`,
            timezone: 'America/Los_Angeles',
            scheduled: `${todayStr()}T13:00:00`,
            terminal: 'I',
            gate: 'G91',
        },
        arrival: {
            city: 'Tokyo',
            airportCode: 'HND',
            timeLocal: `${tomorrowStr()}T17:15:00`,
            timezone: 'Asia/Tokyo',
            scheduled: `${tomorrowStr()}T17:15:00`,
            terminal: '3',
            gate: '114',
            baggage: 'B',
        },
        status: 'On Time',
        aircraft: 'B788',
        live: null,
    },

    // 4. Delayed flight
    {
        id: 'f4',
        airline: 'Delta Airlines',
        flightNumber: 'DL789',
        departure: {
            city: 'Atlanta',
            airportCode: 'ATL',
            timeLocal: `${todayStr()}T15:00:00`,
            timezone: 'America/New_York',
            scheduled: `${todayStr()}T15:00:00`,
            terminal: 'S',
            gate: 'S2',
            delay: 45,
        },
        arrival: {
            city: 'Miami',
            airportCode: 'MIA',
            timeLocal: `${todayStr()}T17:00:00`,
            timezone: 'America/New_York',
            scheduled: `${todayStr()}T17:00:00`,
            terminal: 'J',
            gate: 'J14',
        },
        status: 'Delayed',
        aircraft: 'A321',
        live: null,
    },

    // 5. Very long duration flight
    {
        id: 'f5',
        airline: 'Emirates',
        flightNumber: 'EK202',
        departure: {
            city: 'New York',
            airportCode: 'JFK',
            timeLocal: `${todayStr()}T22:40:00`,
            timezone: 'America/New_York',
            scheduled: `${todayStr()}T22:40:00`,
            terminal: '4',
            gate: 'B40',
        },
        arrival: {
            city: 'Dubai',
            airportCode: 'DXB',
            timeLocal: `${tomorrowStr()}T19:30:00`,
            timezone: 'Asia/Dubai',
            scheduled: `${tomorrowStr()}T19:30:00`,
            terminal: '3',
            gate: 'A7',
            baggage: '7',
        },
        status: 'On Time',
        aircraft: 'A388',
        live: null,
    },

    // 6. Multiple flights for same flight number
    {
        id: 'f6',
        airline: 'American Airlines',
        flightNumber: 'AA123',
        departure: {
            city: 'Los Angeles',
            airportCode: 'LAX',
            timeLocal: `${todayStr()}T13:00:00`,
            timezone: 'America/Los_Angeles',
            scheduled: `${todayStr()}T13:00:00`,
            terminal: '4',
            gate: '44B',
        },
        arrival: {
            city: 'Honolulu',
            airportCode: 'HNL',
            timeLocal: `${todayStr()}T16:50:00`,
            timezone: 'Pacific/Honolulu',
            scheduled: `${todayStr()}T16:50:00`,
            terminal: '1',
            baggage: '2',
        },
        status: 'Landed',
        aircraft: 'B738',
        live: null,
    },

    // 7. Cancelled flight
    {
        id: 'f7',
        airline: 'Southwest Airlines',
        flightNumber: 'WN101',
        departure: {
            city: 'Dallas',
            airportCode: 'DAL',
            timeLocal: `${todayStr()}T09:00:00`,
            timezone: 'America/Chicago',
            scheduled: `${todayStr()}T09:00:00`,
        },
        arrival: {
            city: 'Houston',
            airportCode: 'HOU',
            timeLocal: `${todayStr()}T10:15:00`,
            timezone: 'America/Chicago',
            scheduled: `${todayStr()}T10:15:00`,
        },
        status: 'Cancelled',
        aircraft: 'B73W',
        live: null,
    },

    // 8. Flight over the Atlantic
    {
        id: 'f8',
        airline: 'British Airways',
        flightNumber: 'BA112',
        departure: {
            city: 'New York',
            airportCode: 'JFK',
            timeLocal: `${todayStr()}T18:30:00`,
            timezone: 'America/New_York',
            scheduled: `${todayStr()}T18:30:00`,
            terminal: '7',
            gate: 'B22',
        },
        arrival: {
            city: 'London',
            airportCode: 'LHR',
            timeLocal: `${tomorrowStr()}T06:30:00`,
            timezone: 'Europe/London',
            scheduled: `${tomorrowStr()}T06:30:00`,
            terminal: '5',
            gate: 'B32',
            baggage: '12',
        },
        status: 'On Time',
        aircraft: 'B772',
        live: null,
    },
];

// -----------------------------------------------------------------------------
// SERVER-SIDE CACHE
// -----------------------------------------------------------------------------

interface CacheEntry {
    data: Flight[];
    expiry: number;
}

const flightCache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

interface OurAirportsRecord {
    name?: string;
    latitude_deg?: string;
    longitude_deg?: string;
    iata_code?: string;
}

const airportCache = new Map<string, FlightAirport | null>();
let airportDatasetPromise: Promise<Map<string, FlightAirport>> | null = null;

async function loadAirportDataset(): Promise<Map<string, FlightAirport>> {
    if (airportDatasetPromise) {
        return airportDatasetPromise;
    }

    airportDatasetPromise = (async () => {
        const response = await fetch(
            'https://ourairports.com/data/airports.csv',
            { next: { revalidate: 86_400 } }
        );

        if (!response.ok) {
            throw new Error(`Airport dataset returned status ${response.status}`);
        }

        const records = parse(await response.text(), {
            columns: true,
            skip_empty_lines: true,
            bom: true,
        }) as OurAirportsRecord[];
        const airports = new Map<string, FlightAirport>();

        for (const record of records) {
            const code = record.iata_code?.trim().toUpperCase();
            const latitude = Number(record.latitude_deg);
            const longitude = Number(record.longitude_deg);

            if (
                code &&
                isValidCoordinate(latitude, longitude) &&
                !airports.has(code)
            ) {
                airports.set(code, {
                    code,
                    name: record.name ?? null,
                    latitude,
                    longitude,
                });
            }
        }

        return airports;
    })();

    try {
        return await airportDatasetPromise;
    } catch (error) {
        airportDatasetPromise = null;
        throw error;
    }
}

async function getAirportCoordinates(
    code: string
): Promise<FlightAirport | null> {
    const normalizedCode = code.trim().toUpperCase();

    if (!normalizedCode) {
        return null;
    }

    if (airportCache.has(normalizedCode)) {
        return airportCache.get(normalizedCode) ?? null;
    }

    try {
        const airports = await loadAirportDataset();
        const result = airports.get(normalizedCode) ?? null;

        airportCache.set(normalizedCode, result);
        return result;
    } catch {
        airportCache.set(normalizedCode, null);
        return null;
    }
}

// -----------------------------------------------------------------------------
// AVIATIONSTACK → INTERNAL FLIGHT MAPPING
// -----------------------------------------------------------------------------

function mapAviationStackToFlight(data: AviationStackFlight): Flight {
    // Map AviationStack status to our internal status
    let status: FlightStatus = 'On Time';

    if (data.flight_status === 'scheduled') {
        status = 'On Time';
    } else if (data.flight_status === 'active') {
        status = 'On Time';
    } else if (data.flight_status === 'landed') {
        status = 'Landed';
    } else if (data.flight_status === 'cancelled') {
        status = 'Cancelled';
    }

    // Mark delayed if departure delay is greater than 15 minutes
    if (
        data.departure.delay &&
        data.departure.delay > 15 &&
        data.flight_status !== 'cancelled' &&
        data.flight_status !== 'landed'
    ) {
        status = 'Delayed';
    }

    return {
        id: `${data.flight.iata}-${data.departure.scheduled}`,

        airline: data.airline.name || data.airline.iata,
        airlineIata: data.airline.iata || null,

        flightNumber: data.flight.iata || data.flight.number,

        departure: {
            city: data.departure.airport,
            airportCode: data.departure.iata,
            timeLocal:
                data.departure.estimated || data.departure.scheduled,
            timezone: data.departure.timezone,
            scheduled: data.departure.scheduled,
            estimated: data.departure.estimated || null,
            terminal: data.departure.terminal,
            gate: data.departure.gate,
            delay: data.departure.delay,
            actual: data.departure.actual,
        },

        arrival: {
            city: data.arrival.airport,
            airportCode: data.arrival.iata,
            timeLocal:
                data.arrival.estimated || data.arrival.scheduled,
            timezone: data.arrival.timezone,
            scheduled: data.arrival.scheduled,
            estimated: data.arrival.estimated || null,
            terminal: data.arrival.terminal,
            gate: data.arrival.gate,
            baggage: data.arrival.baggage,
            delay: data.arrival.delay,
            actual: data.arrival.actual,
        },

        status,

        aircraft: data.aircraft?.iata ?? null,
        registration: data.aircraft?.registration ?? null,
        icao24: data.aircraft?.icao24 ?? null,

        // -------------------------------------------------------------
        // LIVE AIRCRAFT POSITION
        // -------------------------------------------------------------
        live: data.live
            ? {
                  updated: data.live.updated,
                  latitude: data.live.latitude,
                  longitude: data.live.longitude,
                  altitude: data.live.altitude,
                  direction: data.live.direction,
                  speed_horizontal: data.live.speed_horizontal,
                  speed_vertical: data.live.speed_vertical,
                  is_ground: data.live.is_ground,
                                    source: 'aviationstack',
              }
            : null,
    };
}

// -----------------------------------------------------------------------------
// GET FLIGHTS BY FLIGHT NUMBER
// -----------------------------------------------------------------------------

export async function getFlights(flightNumber: string): Promise<Flight[]> {
    if (!flightNumber) {
        return [];
    }

    const normalizedQuery = flightNumber.trim().toUpperCase();

    // 1. Check cache
    const cached = flightCache.get(normalizedQuery);

    if (cached && Date.now() < cached.expiry) {
        console.log(
            `[Cache Hit] Returning cached flights for ${normalizedQuery}`
        );

        return cached.data;
    }

    // 2. Fetch from AviationStack
    const apiKey = process.env.AVIATIONSTACK_API_KEY;

    if (!apiKey) {
        throw new Error('AviationStack API key is not configured.');
    }

    const url =
        `http://api.aviationstack.com/v1/flights` +
        `?access_key=${apiKey}` +
        `&flight_iata=${normalizedQuery}`;

    try {
        console.log(
            `[API Call] Fetching AviationStack data for ${normalizedQuery}... (access_key=REDACTED)`
        );

        const response = await fetch(url, {
            next: {
                revalidate: 60,
            },
        });

        if (!response.ok) {
            throw new Error(
                `AviationStack API returned status: ${response.status}`
            );
        }

        const json = (await response.json()) as AviationStackResponse;
        console.log(
    '[AVIATIONSTACK RAW RESPONSE]',
    JSON.stringify(json, null, 2)
);

        if (json.error) {
            throw new Error(
                `AviationStack Error: ${json.error.code} - ${json.error.message}`
            );
        }

        const rawData = json.data || [];

        // Map real AviationStack data
        const mappedFlights = rawData.map(mapAviationStackToFlight);

        const openSkyStates = new Map<string, Awaited<ReturnType<typeof getOpenSkyState>>>();
        const openSkyTracks = new Map<string, Awaited<ReturnType<typeof getOpenSkyTrack>>>();
        const icao24Values = [
            ...new Set(
                mappedFlights
                    .map((flight) => flight.icao24?.trim().toLowerCase())
                    .filter((icao24): icao24 is string => Boolean(icao24))
            ),
        ];

        await Promise.all(
            icao24Values.map(async (icao24) => {
                openSkyStates.set(icao24, await getOpenSkyState(icao24));
                openSkyTracks.set(icao24, await getOpenSkyTrack(icao24));
            })
        );

        const airportCodes = [
            ...new Set(
                mappedFlights.flatMap((flight) => [
                    flight.departure.airportCode,
                    flight.arrival.airportCode,
                ])
            ),
        ];
        const airports = new Map<string, FlightAirport | null>();

        await Promise.all(
            airportCodes.map(async (code) => {
                airports.set(code, await getAirportCoordinates(code));
            })
        );

        const enrichedFlights = mappedFlights.map((flight) => ({
            ...flight,
            live: flight.icao24
                ? openSkyStates.get(flight.icao24.trim().toLowerCase()) ?? flight.live ?? null
                : flight.live ?? null,
            track: flight.icao24
                ? openSkyTracks.get(flight.icao24.trim().toLowerCase()) ?? undefined
                : undefined,
            departureAirport: airports.get(flight.departure.airportCode) ?? undefined,
            arrivalAirport: airports.get(flight.arrival.airportCode) ?? undefined,
        }));

        // Update cache
        flightCache.set(normalizedQuery, {
            data: enrichedFlights,
            expiry: Date.now() + CACHE_TTL_MS,
        });

        return enrichedFlights;
    } catch (error) {
        console.error('[AviationStack Error] Failed to fetch flight data:', error);
        throw new Error('AviationStack flight data is currently unavailable.');
    }
}

// -----------------------------------------------------------------------------
// MOCK FLIGHT SEARCH
// -----------------------------------------------------------------------------

function getMockFlights(normalizedQuery: string): Flight[] {
    return MOCK_FLIGHTS.filter(
        (flight) =>
            flight.flightNumber.toUpperCase() === normalizedQuery
    );
}

// -----------------------------------------------------------------------------
// MOCK AIRPORT SEARCH
// -----------------------------------------------------------------------------

function getMockFlightsByAirport(
    code: string,
    type: 'departures' | 'arrivals'
): Flight[] {
    const upper = code.toUpperCase();

    if (type === 'departures') {
        return MOCK_FLIGHTS.filter(
            (flight) => flight.departure.airportCode === upper
        );
    }

    return MOCK_FLIGHTS.filter(
        (flight) => flight.arrival.airportCode === upper
    );
}

// -----------------------------------------------------------------------------
// GET FLIGHTS BY AIRPORT
// -----------------------------------------------------------------------------

export async function getFlightsByAirport(
    airportCode: string,
    type: 'departures' | 'arrivals'
): Promise<Flight[]> {
    if (!airportCode) {
        return [];
    }

    const normalizedCode = airportCode.trim().toUpperCase();

    const cacheKey = `${type}:${normalizedCode}`;

    // 1. Check cache
    const cached = flightCache.get(cacheKey);

    if (cached && Date.now() < cached.expiry) {
        console.log(
            `[Cache Hit] Returning cached ${type} for ${normalizedCode}`
        );

        return cached.data;
    }

    // 2. Fetch from AviationStack
    const apiKey = process.env.AVIATIONSTACK_API_KEY;

    if (!apiKey) {
        throw new Error('AviationStack API key is not configured.');
    }

    const param =
        type === 'departures'
            ? 'dep_iata'
            : 'arr_iata';

    const url =
        `http://api.aviationstack.com/v1/flights` +
        `?access_key=${apiKey}` +
        `&${param}=${normalizedCode}`;

    try {
        console.log(
            `[API Call] Fetching AviationStack ${type} for ${normalizedCode}... (access_key=REDACTED)`
        );

        const response = await fetch(url, {
            next: {
                revalidate: 60,
            },
        });

        if (!response.ok) {
            throw new Error(
                `AviationStack API returned status: ${response.status}`
            );
        }

        const json = (await response.json()) as AviationStackResponse;

        if (json.error) {
            throw new Error(
                `AviationStack Error: ${json.error.code} - ${json.error.message}`
            );
        }

        const mappedFlights = (json.data || []).map(
            mapAviationStackToFlight
        );

        flightCache.set(cacheKey, {
            data: mappedFlights,
            expiry: Date.now() + CACHE_TTL_MS,
        });

        return mappedFlights;
    } catch (error) {
        console.error(`[AviationStack Error] Failed to fetch ${type}:`, error);
        throw new Error('AviationStack airport data is currently unavailable.');
    }
}