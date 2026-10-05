export type FlightStatus = 'On Time' | 'Delayed' | 'Landed' | 'Cancelled';

export interface Flight {
  id: string;
  airline: string;
  airlineIata?: string | null;
  flightNumber: string;

  departure: {
    city: string;
    airportCode: string;
    timeLocal: string; // ISO 8601 string representing local time
    timezone: string; // IANA timezone string e.g., 'America/Los_Angeles'
    scheduled: string;
    estimated?: string | null;
    terminal?: string | null;
    gate?: string | null;
    delay?: number | null; // minutes late
    actual?: string | null; // actual departure ISO string
  };

  arrival: {
    city: string;
    airportCode: string;
    timeLocal: string; // ISO 8601 string representing local time
    timezone: string; // IANA timezone string e.g., 'Asia/Tokyo'
    scheduled: string;
    estimated?: string | null;
    terminal?: string | null;
    gate?: string | null;
    baggage?: string | null; // baggage claim belt
    delay?: number | null;
    actual?: string | null;
  };

   status: FlightStatus;
  aircraft?: string | null; // IATA aircraft type code e.g. 'B77W'
  registration?: string | null;
  icao24?: string | null;

  live?: AviationStackLive | null;
  track?: FlightTrackPoint[];
  departureAirport?: FlightAirport;
  arrivalAirport?: FlightAirport;
}

export interface FlightTrackPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  heading?: number | null;
  timestamp?: number | null;
}

export interface FlightAirport {
  code?: string | null;
  name?: string | null;
  latitude: number;
  longitude: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// --- AviationStack API Interfaces ---

export interface AviationStackPagination {
  limit: number;
  offset: number;
  count: number;
  total: number;
}

export interface AviationStackDeparture {
  airport: string;
  timezone: string;
  iata: string;
  icao: string;
  terminal: string | null;
  gate: string | null;
  delay: number | null;
  scheduled: string;
  estimated: string;
  actual: string | null;
  estimated_runway: string | null;
  actual_runway: string | null;
}

export interface AviationStackArrival {
  airport: string;
  timezone: string;
  iata: string;
  icao: string;
  terminal: string | null;
  gate: string | null;
  baggage: string | null;
  delay: number | null;
  scheduled: string;
  estimated: string;
  actual: string | null;
  estimated_runway: string | null;
  actual_runway: string | null;
}

export interface AviationStackAirline {
  name: string;
  iata: string;
  icao: string;
}

export interface AviationStackFlightInfo {
  number: string;
  iata: string;
  icao: string;
  codeshared: unknown | null;
}

export interface AviationStackAircraft {
  registration: string | null;
  iata: string | null;
  icao: string | null;
  icao24: string | null;
}

export interface AviationStackLive {
  updated: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  direction: number | null;
  speed_horizontal: number | null;
  speed_vertical: number | null;
  is_ground: boolean | null;
  source?: 'aviationstack' | 'opensky';
  velocity?: number | null;
  heading?: number | null;
  callsign?: string | null;
  timePosition?: number | null;
  lastContact?: number | null;
  geoAltitude?: number | null;
  stateAge?: number | null;
}

export interface AviationStackFlight {
  flight_date: string;
  flight_status: 'scheduled' | 'active' | 'landed' | 'cancelled' | 'incident' | 'diverted';
  departure: AviationStackDeparture;
  arrival: AviationStackArrival;
  airline: AviationStackAirline;
  flight: AviationStackFlightInfo;
  aircraft: AviationStackAircraft | null;
  live: AviationStackLive | null;
}

export interface AviationStackResponse {
  pagination: AviationStackPagination;
  data: AviationStackFlight[];
  // If error occurs
  error?: {
    code: string;
    message: string;
  };
}
