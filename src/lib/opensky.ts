import { AviationStackLive, FlightTrackPoint } from '@/types';

interface OpenSkyStateResponse {
    time: number;
    states: OpenSkyState[] | null;
}

type OpenSkyState = [
    icao24: string,
    callsign: string | null,
    originCountry: string | null,
    timePosition: number | null,
    lastContact: number,
    longitude: number | null,
    latitude: number | null,
    baroAltitude: number | null,
    onGround: boolean | null,
    velocity: number | null,
    trueTrack: number | null,
    verticalRate: number | null,
    sensors: number[] | null,
    geoAltitude: number | null,
    squawk: string | null,
    spi: boolean | null,
    positionSource: number | null,
    category?: number | null,
];

interface OpenSkyTrackResponse {
    path?: OpenSkyTrackPoint[] | null;
}

type OpenSkyTrackPoint = [
    time: number,
    latitude: number,
    longitude: number,
    altitude: number | null,
    heading: number | null,
    onGround: boolean,
];

const OPENSKY_TIMEOUT_MS = 8_000;

function isFiniteNumber(value: number | null): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

export function isValidCoordinate(
    latitude: unknown,
    longitude: unknown
): latitude is number {
    const numericLatitude = typeof latitude === 'number' ? latitude : null;
    const numericLongitude = typeof longitude === 'number' ? longitude : null;

    return (
        isFiniteNumber(numericLatitude) &&
        isFiniteNumber(numericLongitude) &&
        numericLatitude >= -90 &&
        numericLatitude <= 90 &&
        numericLongitude >= -180 &&
        numericLongitude <= 180 &&
        !(numericLatitude === 0 && numericLongitude === 0)
    );
}

function toIsoTimestamp(unixSeconds: number | null): string | null {
    return isFiniteNumber(unixSeconds)
        ? new Date(unixSeconds * 1000).toISOString()
        : null;
}

export async function getOpenSkyState(
    icao24: string
): Promise<AviationStackLive | null> {
    const normalizedIcao24 = icao24.trim().toLowerCase();

    if (!normalizedIcao24) {
        return null;
    }

    const url = new URL('https://opensky-network.org/api/states/all');
    url.searchParams.set('icao24', normalizedIcao24);

    try {
        const response = await fetch(url, {
            cache: 'no-store',
            signal: AbortSignal.timeout(OPENSKY_TIMEOUT_MS),
        });

        if (!response.ok) {
            return null;
        }

        const json = (await response.json()) as OpenSkyStateResponse;
        const state = json.states?.find(
            (candidate) => candidate[0]?.toLowerCase() === normalizedIcao24
        );

        if (!state || !isFiniteNumber(state[5]) || !isFiniteNumber(state[6])) {
            return null;
        }

        const lastContact = isFiniteNumber(state[4]) ? state[4] : null;
        const timePosition = isFiniteNumber(state[3]) ? state[3] : null;
        const velocity = isFiniteNumber(state[9]) ? state[9] : null;
        const heading = isFiniteNumber(state[10]) ? state[10] : null;
        const verticalRate = isFiniteNumber(state[11]) ? state[11] : null;
        const altitude = isFiniteNumber(state[7]) ? state[7] : null;
        const geoAltitude = isFiniteNumber(state[13]) ? state[13] : null;

        return {
            updated: toIsoTimestamp(lastContact) ?? '',
            latitude: state[6],
            longitude: state[5],
            altitude,
            direction: heading,
            speed_horizontal: velocity === null ? null : velocity * 3.6,
            speed_vertical: verticalRate,
            is_ground: state[8],
            source: 'opensky',
            velocity,
            heading,
            callsign: state[1]?.trim() || null,
            timePosition,
            lastContact,
            geoAltitude,
            stateAge: lastContact === null
                ? null
                : Math.max(0, Math.floor(Date.now() / 1000 - lastContact)),
        };
    } catch {
        return null;
    }
}

export async function getOpenSkyTrack(
    icao24: string
): Promise<FlightTrackPoint[] | null> {
    const normalizedIcao24 = icao24.trim().toLowerCase();

    if (!normalizedIcao24) {
        return null;
    }

    const url = new URL('https://opensky-network.org/api/tracks/all');
    url.searchParams.set('icao24', normalizedIcao24);
    url.searchParams.set('time', '0');

    try {
        const response = await fetch(url, {
            cache: 'no-store',
            signal: AbortSignal.timeout(OPENSKY_TIMEOUT_MS),
        });

        if (!response.ok) {
            return null;
        }

        const json = (await response.json()) as OpenSkyTrackResponse;
        const points = (json.path ?? [])
            .filter((point) => isValidCoordinate(point[1], point[2]))
            .map((point) => ({
                latitude: point[1],
                longitude: point[2],
                altitude: isFiniteNumber(point[3]) ? point[3] : null,
                heading: isFiniteNumber(point[4]) ? point[4] : null,
                timestamp: isFiniteNumber(point[0]) ? point[0] : null,
            }));

        return points.length >= 2 ? points : null;
    } catch {
        return null;
    }
}
