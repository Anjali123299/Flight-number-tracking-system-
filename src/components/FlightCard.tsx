'use client';

import { Flight } from '@/types';
import { cn } from '@/lib/utils';
import {
    Clock,
    PlaneTakeoff,
    PlaneLanding,
    Plane,
    DoorOpen,
    Luggage,
} from 'lucide-react';
import { differenceInCalendarDays, differenceInMinutes } from 'date-fns';
import { fromZonedTime, toDate } from 'date-fns-tz';
import dynamic from 'next/dynamic';

const FlightMap = dynamic(
    () => import('./FlightMap'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-[500px] rounded-2xl bg-slate-900 flex items-center justify-center text-slate-400">
                Loading map...
            </div>
        ),
    }
);

interface FlightCardProps {
    flight: Flight;
    index?: number;
}

const STATUS_STRIPE: Record<string, string> = {
    'On Time': 'bg-emerald-500',
    'Delayed': 'bg-amber-500',
    'Landed': 'bg-sky-500',
    'Cancelled': 'bg-rose-500',
};

export function FlightCard({ flight, index = 0 }: FlightCardProps) {
    const parseToUtc = (localStr: string, tz: string) => {
        try {
            if (typeof fromZonedTime === 'function') {
                return fromZonedTime(localStr, tz);
            }

            return toDate(localStr, { timeZone: tz });
        } catch {
            return new Date(localStr);
        }
    };

    const depDateUtc = parseToUtc(
        flight.departure.timeLocal,
        flight.departure.timezone
    );

    const arrDateUtc = parseToUtc(
        flight.arrival.timeLocal,
        flight.arrival.timezone
    );

    const durationMin = differenceInMinutes(
        arrDateUtc,
        depDateUtc
    );

    const durHours = Math.floor(durationMin / 60);
    const durMins = durationMin % 60;

    const airportDepTime = new Intl.DateTimeFormat('en-US', {
        timeZone: flight.departure.timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(depDateUtc);

    const airportArrTime = new Intl.DateTimeFormat('en-US', {
        timeZone: flight.arrival.timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(arrDateUtc);

    const depDateLabel = new Intl.DateTimeFormat('en-US', {
        timeZone: flight.departure.timezone,
        month: 'short',
        day: 'numeric',
    }).format(depDateUtc);

    const arrDateLabel = new Intl.DateTimeFormat('en-US', {
        timeZone: flight.arrival.timezone,
        month: 'short',
        day: 'numeric',
    }).format(arrDateUtc);

    const userDepTime = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(depDateUtc);

    const userArrTime = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(arrDateUtc);

    const userTz =
        Intl.DateTimeFormat().resolvedOptions().timeZone;

    const isDepDifferentTz =
        flight.departure.timezone !== userTz;

    const isArrDifferentTz =
        flight.arrival.timezone !== userTz;

    const dayDiff = differenceInCalendarDays(
        arrDateUtc,
        depDateUtc
    );

    const delayClasses = [
        '',
        'animate-delay-1',
        'animate-delay-2',
        'animate-delay-3',
        'animate-delay-4',
    ];

    const delayClass =
        delayClasses[Math.min(index, delayClasses.length - 1)];

    const hasLivePosition =
        flight.live?.latitude != null &&
        flight.live?.longitude != null;
    const hasRouteData =
        (flight.track?.length ?? 0) >= 2 ||
        (flight.departureAirport != null && flight.arrivalAirport != null);

    return (
        <div
            className={cn(
                'group glass glass-hover transition-all duration-300 rounded-2xl overflow-hidden relative animate-fade-up',
                delayClass
            )}
        >
            <div
                className={cn(
                    'absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl',
                    STATUS_STRIPE[flight.status]
                )}
            />

            <div className="p-6 pl-7">

                {/* Status badge */}
                <div className="absolute top-6 right-6 z-10">
                    <span
                        className={cn(
                            'px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase',
                            flight.status === 'On Time' &&
                                'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
                            flight.status === 'Delayed' &&
                                'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
                            flight.status === 'Landed' &&
                                'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20',
                            flight.status === 'Cancelled' &&
                                'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'
                        )}
                    >
                        {flight.status}
                    </span>
                </div>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="h-10 w-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400 ring-1 ring-sky-500/20">
                        <Plane className="h-5 w-5" />
                    </div>

                    <div>
                        <h3 className="font-bold text-lg text-white">
                            {flight.airline}
                        </h3>

                        <p className="text-slate-500 text-sm font-medium">
                            Flight {flight.flightNumber}

                            {flight.aircraft && (
                                <span className="ml-2 text-slate-600">
                                    · Aircraft {flight.aircraft}
                                </span>
                            )}
                        </p>

                        {(flight.registration || flight.icao24 || flight.airlineIata) && (
                            <p className="text-xs text-slate-600 mt-1">
                                {flight.airlineIata && `Airline ${flight.airlineIata}`}
                                {flight.registration && ` · ${flight.registration}`}
                                {flight.icao24 && ` · ICAO24 ${flight.icao24}`}
                            </p>
                        )}
                    </div>
                </div>

                {/* Flight information */}
                <div className="flex items-start justify-between relative z-10">

                    {/* Departure */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 text-slate-500">
                            <PlaneTakeoff className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">
                                Departure
                            </span>
                        </div>

                        <div className="text-3xl font-extrabold text-white mb-0.5">
                            {airportDepTime}
                        </div>

                        <div className="text-xs text-slate-500 mb-1">
                            {depDateLabel}
                        </div>

                        {isDepDifferentTz && (
                            <div className="text-xs text-sky-400 font-medium mb-1">
                                {userDepTime}{' '}
                                <span className="text-slate-500">
                                    (Your Time)
                                </span>
                            </div>
                        )}

                        <div className="font-bold text-lg text-sky-400">
                            {flight.departure.airportCode}
                        </div>

                        <div className="text-sm text-slate-500">
                            {flight.departure.city}
                        </div>
                    </div>

                    {/* Route */}
                    <div className="flex-1 flex flex-col items-center justify-center pt-8 px-4">
                        <div className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-2">
                            <Clock className="w-3 h-3" />
                            {durHours}h {durMins}m
                        </div>

                        <div className="w-full flex items-center">
                            <div className="h-[2px] w-full bg-gradient-to-r from-sky-500/40 to-sky-400/60 rounded-l-full" />

                            <Plane className="w-5 h-5 text-sky-400 mx-2 flex-shrink-0" />

                            <div className="h-[2px] w-full bg-gradient-to-r from-sky-400/60 to-sky-500/40 rounded-r-full" />
                        </div>
                    </div>

                    {/* Arrival */}
                    <div className="flex-1 text-right">
                        <div className="flex items-center justify-end gap-2 mb-1 text-slate-500">
                            <span className="text-xs font-medium uppercase tracking-wider">
                                Arrival
                            </span>

                            <PlaneLanding className="h-4 w-4" />
                        </div>

                        <div className="flex items-start justify-end gap-2">
                            <div className="text-3xl font-extrabold text-white mb-0.5">
                                {airportArrTime}
                            </div>

                            {dayDiff > 0 && (
                                <span className="mt-1 text-xs font-bold text-amber-400 bg-amber-500/10 ring-1 ring-amber-500/20 px-1.5 py-0.5 rounded-full leading-tight">
                                    +{dayDiff}
                                </span>
                            )}
                        </div>

                        <div className="text-xs text-slate-500 mb-1">
                            {arrDateLabel}
                        </div>

                        {isArrDifferentTz && (
                            <div className="text-xs text-sky-400 font-medium mb-1 flex justify-end gap-1">
                                <span className="text-slate-500">
                                    (Your Time)
                                </span>{' '}
                                {userArrTime}
                            </div>
                        )}

                        <div className="font-bold text-lg text-sky-400">
                            {flight.arrival.airportCode}
                        </div>

                        <div className="text-sm text-slate-500">
                            {flight.arrival.city}
                        </div>
                    </div>
                </div>

                {/* Terminal / Gate / Baggage */}
                {(flight.departure.terminal ||
                    flight.departure.gate ||
                    flight.arrival.terminal ||
                    flight.arrival.gate ||
                    flight.arrival.baggage) && (
                    <div className="mt-5 pt-4 border-t border-white/[0.06] flex justify-between text-xs text-slate-500 relative z-10">

                        <div className="flex items-center gap-3">
                            {(flight.departure.terminal ||
                                flight.departure.gate) && (
                                <div className="flex items-center gap-1.5">
                                    <DoorOpen className="w-3.5 h-3.5 text-slate-600" />

                                    <span>
                                        {flight.departure.terminal && (
                                            <span>
                                                Terminal{' '}
                                                {flight.departure.terminal}
                                            </span>
                                        )}

                                        {flight.departure.terminal &&
                                            flight.departure.gate && (
                                                <span className="mx-1 text-slate-700">
                                                    ·
                                                </span>
                                            )}

                                        {flight.departure.gate && (
                                            <span>
                                                Gate{' '}
                                                {flight.departure.gate}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 text-right">
                            {(flight.arrival.terminal ||
                                flight.arrival.gate) && (
                                <div className="flex items-center gap-1.5">
                                    <DoorOpen className="w-3.5 h-3.5 text-slate-600" />

                                    <span>
                                        {flight.arrival.terminal && (
                                            <span>
                                                Terminal{' '}
                                                {flight.arrival.terminal}
                                            </span>
                                        )}

                                        {flight.arrival.terminal &&
                                            flight.arrival.gate && (
                                                <span className="mx-1 text-slate-700">
                                                    ·
                                                </span>
                                            )}

                                        {flight.arrival.gate && (
                                            <span>
                                                Gate{' '}
                                                {flight.arrival.gate}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}

                            {flight.arrival.baggage && (
                                <div className="flex items-center gap-1.5">
                                    <Luggage className="w-3.5 h-3.5 text-slate-600" />
                                    <span>
                                        Baggage {flight.arrival.baggage}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ================================================== */}
                {/* LIVE FLIGHT MAP */}
                {/* ================================================== */}

                    {(hasLivePosition || hasRouteData) && (
                        <div className="mt-6 relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className="text-white font-semibold">
                                        {hasLivePosition
                                            ? 'Live Flight Position'
                                            : 'Flight Route'}
                                    </h4>

                                    <p className="text-xs text-slate-500">
                                        {flight.departure.airportCode}
                                        {' → '}
                                        {flight.arrival.airportCode}
                                    </p>
                                </div>

                                {hasLivePosition && flight.live && (
                                    <div className="text-right">
                                        <div className="text-xs text-emerald-400 font-medium">
                                            ● LIVE
                                        </div>

                                        <div className="text-xs text-slate-500">
                                            {flight.live.speed_horizontal != null
                                                ? `${Math.round(flight.live.speed_horizontal)} km/h`
                                                : 'Speed unavailable'}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {hasLivePosition && flight.live && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
                                <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                                    <div className="text-slate-600">Altitude</div>
                                    <div className="text-slate-300 font-semibold">
                                        {flight.live.altitude != null
                                            ? `${Math.round(flight.live.altitude)} m`
                                            : 'Unavailable'}
                                    </div>
                                </div>
                                <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                                    <div className="text-slate-600">Heading</div>
                                    <div className="text-slate-300 font-semibold">
                                        {flight.live.heading != null
                                            ? `${Math.round(flight.live.heading)}°`
                                            : 'Unavailable'}
                                    </div>
                                </div>
                                <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                                    <div className="text-slate-600">Callsign</div>
                                    <div className="text-slate-300 font-semibold truncate">
                                        {flight.live.callsign || 'Unavailable'}
                                    </div>
                                </div>
                                <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                                    <div className="text-slate-600">State age</div>
                                    <div className="text-slate-300 font-semibold">
                                        {flight.live.stateAge != null
                                            ? `${flight.live.stateAge}s`
                                            : 'Unavailable'}
                                    </div>
                                </div>
                                </div>
                            )}

                            <FlightMap
                                latitude={flight.live?.latitude}
                                longitude={flight.live?.longitude}
                                direction={flight.live?.direction ?? 0}
                                track={flight.track}
                                departure={flight.departureAirport
                                    ? {
                                          latitude: flight.departureAirport.latitude,
                                          longitude: flight.departureAirport.longitude,
                                          airportCode: flight.departure.airportCode,
                                      }
                                    : undefined}
                                arrival={flight.arrivalAirport
                                    ? {
                                          latitude: flight.arrivalAirport.latitude,
                                          longitude: flight.arrivalAirport.longitude,
                                          airportCode: flight.arrival.airportCode,
                                      }
                                    : undefined}
                                flightNumber={flight.flightNumber}
                                airline={flight.airline}
                                aircraft={flight.aircraft}
                                registration={flight.registration}
                                icao24={flight.icao24}
                            />
                        </div>
                    )}

                {!hasLivePosition && !hasRouteData && (
                        <div className="mt-6 p-4 rounded-xl bg-slate-900/50 border border-white/[0.06] text-center">
                            <p className="text-sm text-slate-500">
                                Live position unavailable. OpenSky did not
                                provide a current state for this flight.
                            </p>
                        </div>
                    )}
            </div>
        </div>
    );
}