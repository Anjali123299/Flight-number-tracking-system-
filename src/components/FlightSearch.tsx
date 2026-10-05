'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Sparkles, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

// Flight number: 1-3 alphanumeric airline characters, including at least one
// letter, followed by 1-4 digits (e.g. 6E2134, AI123, BA4).
const FLIGHT_REGEX = /^(?=[A-Z0-9]{1,3}\d{1,4}$)(?=.*[A-Z])[A-Z0-9]{1,3}\d{1,4}$/i;
// Airport IATA code: exactly 3 letters  (e.g. JFK, LAX)
const AIRPORT_REGEX = /^[A-Z]{3}$/i;

const SAMPLE_FLIGHTS = ['AA123', 'UA456', 'JL001', 'DL789', 'EK202', 'WN101', 'BA112'];
const STORAGE_KEY = 'aero_recent_searches';
const MAX_RECENT = 5;

export type SearchType = 'flight' | 'departures' | 'arrivals';

interface FlightSearchProps {
    onSearch: (query: string, type: SearchType) => void;
    isLoading: boolean;
    defaultValue?: string;
}

function loadRecent(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
        return [];
    }
}

function saveRecent(query: string) {
    try {
        const existing = loadRecent().filter((q) => q !== query.toUpperCase());
        const updated = [query.toUpperCase(), ...existing].slice(0, MAX_RECENT);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // localStorage unavailable — ignore
    }
}

function clearRecent() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}

function inferSearchType(value: string): SearchType {
    if (AIRPORT_REGEX.test(value)) return 'departures';
    return 'flight';
}

export function FlightSearch({ onSearch, isLoading, defaultValue = '' }: FlightSearchProps) {
    const [inputVal, setInputVal] = useState(defaultValue);
    const [error, setError] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load recent searches from localStorage on mount
    useEffect(() => {
        setRecentSearches(loadRecent());
    }, []);

    // Sync if parent changes defaultValue (e.g. URL param on first load)
    useEffect(() => {
        if (defaultValue && defaultValue !== inputVal) {
            setInputVal(defaultValue);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultValue]);

    const triggerSearch = (value: string) => {
        const type = inferSearchType(value);
        saveRecent(value);
        setRecentSearches(loadRecent());
        onSearch(value, type);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase().replace(/\s/g, '');
        setInputVal(value);
        setError('');

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (!value) {
            onSearch('', 'flight');
            return;
        }

        timeoutRef.current = setTimeout(() => {
            if (FLIGHT_REGEX.test(value) || AIRPORT_REGEX.test(value)) {
                triggerSearch(value);
            } else {
                setError('Enter a flight number (e.g. 6E2134) or airport code (e.g. JFK)');
            }
        }, 600);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (!inputVal) return;

        if (FLIGHT_REGEX.test(inputVal) || AIRPORT_REGEX.test(inputVal)) {
            triggerSearch(inputVal);
        } else {
            setError('Enter a flight number (e.g. 6E2134) or airport code (e.g. JFK)');
        }
    };

    const clearInput = () => {
        setInputVal('');
        setError('');
        onSearch('', 'flight');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const handleChipClick = (query: string) => {
        setInputVal(query);
        setError('');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        triggerSearch(query);
    };

    const handleClearRecent = () => {
        clearRecent();
        setRecentSearches([]);
    };

    const isAirportInput = AIRPORT_REGEX.test(inputVal);
    const showRecent = recentSearches.length > 0;

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit} className="relative group mb-4">
                {/* Input row */}
                <div
                    className={cn(
                        "flex items-center backdrop-blur-xl border-2 rounded-2xl p-2 transition-all duration-300",
                        "bg-white/[0.04]",
                        error
                            ? "border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                            : "border-white/[0.08] focus-within:border-sky-500/50 focus-within:shadow-[0_0_30px_rgba(14,165,233,0.12)]"
                    )}
                >
                    <div className="pl-3 pr-2 text-slate-500">
                        {isAirportInput
                            ? <MapPin className={cn("w-5 h-5 transition-colors duration-200 text-sky-400")} />
                            : <Search className={cn("w-5 h-5 transition-colors duration-200", isLoading ? "animate-pulse text-sky-400" : "")} />
                        }
                    </div>
                    <input
                        type="text"
                        value={inputVal}
                        onChange={handleChange}
                        placeholder="AA123 or JFK"
                        className="flex-1 bg-transparent border-none outline-none text-lg font-semibold text-white placeholder:text-slate-600 placeholder:font-medium placeholder:uppercase min-w-0"
                        id="flight-search-input"
                    />
                    {inputVal && (
                        <button
                            type="button"
                            onClick={clearInput}
                            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
                            aria-label="Clear search"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Submit button — full width below input */}
                <button
                    type="submit"
                    disabled={!inputVal || isLoading || !!error}
                    className="w-full mt-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 cursor-pointer shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.4)] disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0"
                    id="flight-search-submit"
                >
                    {isLoading ? 'Searching...' : isAirportInput ? 'Departures' : 'Search'}
                </button>

                {error && (
                    <div className="mt-2 text-xs font-semibold text-rose-400 pl-2 w-full text-left">
                        {error}
                    </div>
                )}
            </form>

            {/* Recent searches or sample flights panel */}
            <div className="glass rounded-xl p-3 mt-4">
                {showRecent ? (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-slate-500 ml-1 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-sky-400" />
                                <span>Recent</span>
                            </p>
                            <button
                                type="button"
                                onClick={handleClearRecent}
                                className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors duration-200 flex items-center gap-1 cursor-pointer"
                                aria-label="Clear recent searches"
                            >
                                <X className="w-3 h-3" />
                                Clear
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {recentSearches.map((q) => (
                                <button
                                    key={q}
                                    type="button"
                                    onClick={() => handleChipClick(q)}
                                    disabled={isLoading}
                                    className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] hover:border-sky-500/30 hover:bg-white/[0.08] text-slate-300 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:text-white flex items-center gap-1"
                                >
                                    <Clock className="w-2.5 h-2.5 text-slate-600" />
                                    {q}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-xs font-semibold text-slate-500 mb-2 ml-1 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                            <span>Try these:</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {SAMPLE_FLIGHTS.map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => handleChipClick(f)}
                                    disabled={isLoading}
                                    className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] hover:border-sky-500/30 hover:bg-white/[0.08] text-slate-300 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:text-white"
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
