'use client';

import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface FlightMapProps {
  latitude?: number | null;
  longitude?: number | null;
  direction?: number | null;
  track?: Array<{
    latitude: number;
    longitude: number;
    altitude?: number | null;
    heading?: number | null;
    timestamp?: number | null;
  }>;
  departure?: {
    latitude?: number;
    longitude?: number;
    airportCode?: string;
  };
  arrival?: {
    latitude?: number;
    longitude?: number;
    airportCode?: string;
  };
  flightNumber: string;
  airline?: string;
  aircraft?: string | null;
  registration?: string | null;
  icao24?: string | null;
}

function isValidCoordinate(
  latitude: number | null | undefined,
  longitude: number | null | undefined
) {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

function MapCenter({
  latitude,
  longitude,
  aircraftKey,
}: {
  latitude: number;
  longitude: number;
  aircraftKey: string;
}) {
  const map = useMap();
  const centeredAircraftRef = useRef<string | null>(null);

  useEffect(() => {
    if (centeredAircraftRef.current === aircraftKey) return;

    map.setView([latitude, longitude], 6);
    centeredAircraftRef.current = aircraftKey;
  }, [aircraftKey, latitude, longitude, map]);

  return null;
}

function createPlaneIcon(direction: number) {
  return L.divIcon({
    className: 'flight-plane-marker',
    html: `
      <div style="
        transform: rotate(${direction}deg);
        font-size: 30px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));
      ">
        ✈
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function createAirportIcon() {
  return L.divIcon({
    className: 'airport-marker',
    html: `
      <div style="
        width: 14px;
        height: 14px;
        background: #2563eb;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 5px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function FlightMap({
  latitude,
  longitude,
  direction = 0,
  departure,
  arrival,
  track,
  flightNumber,
  airline,
  aircraft,
  registration,
  icao24,
}: FlightMapProps) {
  const hasLivePosition =
    isValidCoordinate(latitude, longitude);

  const validTrack = (track ?? [])
    .filter((point) => isValidCoordinate(point.latitude, point.longitude))
    .map((point) => [point.latitude, point.longitude] as [number, number]);

  const validDeparture =
    isValidCoordinate(departure?.latitude, departure?.longitude)
      ? {
          latitude: departure!.latitude!,
          longitude: departure!.longitude!,
          airportCode: departure?.airportCode,
        }
      : null;
  const validArrival =
    isValidCoordinate(arrival?.latitude, arrival?.longitude)
      ? {
          latitude: arrival!.latitude!,
          longitude: arrival!.longitude!,
          airportCode: arrival?.airportCode,
        }
      : null;

  const route = (() => {
    if (validDeparture && validArrival) {
      return [
        [validDeparture.latitude, validDeparture.longitude] as [
          number,
          number
        ],
        [validArrival.latitude, validArrival.longitude] as [
          number,
          number
        ],
      ];
    }

    return [];
  })();

  // If AviationStack does not provide live coordinates,
  // show a useful map centered on the flight route if possible.
  const mapCenter: [number, number] = hasLivePosition
    ? [latitude!, longitude!]
    : validDeparture
      ? [validDeparture.latitude, validDeparture.longitude]
      : [20, 0];

  return (
    <div
      style={{
        width: '100%',
        height: '500px',
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid #e5e7eb',
      }}
    >
      <MapContainer
        center={mapCenter}
        zoom={hasLivePosition ? 5 : 3}
        scrollWheelZoom={true}
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(process.env.NEXT_PUBLIC_CARTO_API_KEY ?? '')}`}
        />

        {hasLivePosition && (
          <>
            <MapCenter
              latitude={latitude!}
              longitude={longitude!}
              aircraftKey={icao24 ?? flightNumber}
            />

            <Marker
              position={[latitude!, longitude!]}
              icon={createPlaneIcon(direction ?? 0)}
            >
              <Popup>
                <strong>{flightNumber}</strong>
                <br />
                {airline}
                {aircraft && <><br />Aircraft: {aircraft}</>}
                {registration && <><br />Registration: {registration}</>}
                {icao24 && <><br />ICAO24: {icao24}</>}
                <br />
                Live aircraft position
              </Popup>
            </Marker>
          </>
        )}

        {validTrack.length >= 2 && (
          <Polyline
            positions={validTrack}
            pathOptions={{
              color: '#f97316',
              weight: 4,
              opacity: 0.9,
            }}
          >
            <Popup>Actual flight path</Popup>
          </Polyline>
        )}

        {validDeparture && (
            <Marker
              position={[
                validDeparture.latitude,
                validDeparture.longitude,
              ]}
              icon={createAirportIcon()}
            >
              <Popup>
                Departure: {validDeparture.airportCode}
              </Popup>
            </Marker>
          )}

        {validArrival && (
            <Marker
              position={[
                validArrival.latitude,
                validArrival.longitude,
              ]}
              icon={createAirportIcon()}
            >
              <Popup>
                Arrival: {validArrival.airportCode}
              </Popup>
            </Marker>
          )}

        {route.length === 2 && (
          <Polyline
            positions={route}
            pathOptions={{
              color: '#38bdf8',
              weight: 3,
              dashArray: '8 8',
            }}
          >
            <Popup>Planned route</Popup>
          </Polyline>
        )}
      </MapContainer>

      {!hasLivePosition && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            background: 'rgba(255,255,255,0.95)',
            padding: '14px 20px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            textAlign: 'center',
            fontSize: '14px',
          }}
        >
          Live aircraft position is not available
          <br />
          for this flight.
        </div>
      )}
    </div>
  );
}