# Flight Number Tracking System

✈️ A web-based flight status tracking system for searching flights and viewing flight information and locations on an interactive map.

A real-time flight status tracker built with Next.js. Search by flight number (e.g. `AA123`) or airport IATA code (e.g. `JFK`) to get live departure/arrival times, terminal and gate info, baggage claim, and timezone conversions.

---

## Features

- **Flight number search** — look up any flight by IATA code (e.g. `BA112`, `EK202`)
- **Airport departures search** — enter a 3-letter airport code to see all departures
- **Timezone-aware times** — displays times in both the airport's local timezone and your local timezone
- **+N day badge** — overnight and international flights show a `+1` / `+2` indicator on arrival
- **Terminal, gate & baggage** — surfaces terminal, gate, and baggage claim belt from the API when available
- **Aircraft type** — shows IATA aircraft type code (e.g. `B77W`, `A388`)
- **Interactive flight map** — view aircraft positions, recorded flight paths, and departure/arrival airports when location data is available
- **Aircraft tracking** — supplements flight data with aircraft positions and tracks from OpenSky when an aircraft identifier is available
- **Recent search history** — last 5 searches saved to localStorage for quick access
- **URL state** — search query persists in `?q=` so searches are shareable and survive refresh
- **Loading skeletons** — shimmer placeholders during fetch
- **Mock data fallback** — if the API is unavailable or the key is missing, a built-in set of 8 sample flights is returned
- **Server-side rate limiting** — 10 requests per minute per IP (in-memory; swap for Redis in production)
- **Animated CSS background** — soft radial gradient orbs; no external dependencies or WebGL overhead

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Language | TypeScript 5 (strict) |
| Date/Timezone | date-fns 4, date-fns-tz 3 |
| Icons | Lucide React |
| Flight data | [AviationStack API](https://aviationstack.com/) and [OpenSky Network](https://opensky-network.org/) |
| Maps | Leaflet, React Leaflet, and OpenStreetMap/CARTO tiles |
| Font | DM Sans (Google Fonts) |

---

## Prerequisites

- **Node.js** 18+
- A free **AviationStack API key** — sign up at [aviationstack.com](https://aviationstack.com/)

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Create the environment file
cp .env.local.example .env.local   # or create it manually (see below)

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
AVIATIONSTACK_API_KEY=your_api_key_here
```

| Variable | Required | Description |
|----------|----------|-------------|
| `AVIATIONSTACK_API_KEY` | Yes | AviationStack API key for live flight data |

> **Without a key** the app falls back to 8 built-in mock flights automatically — no errors shown to the user.

---

## Project Structure

```
src/
├── app/
│   ├── api/flights/route.ts   # GET /api/flights — rate limiting + search routing
│   ├── layout.tsx             # Root layout (DM Sans font, dark theme)
│   ├── page.tsx               # Home page — sidebar layout, URL params, state
│   └── globals.css            # Tailwind v4, glass utility, animations
├── components/
│   ├── FlightCard.tsx         # Full flight detail card (times, date, +1, gate, etc.)
│   ├── FlightMap.tsx          # Interactive aircraft, route, and airport map
│   ├── FlightListItem.tsx     # Compact row for overflow results
│   ├── FlightSearch.tsx       # Search input + recent history + sample chips
│   ├── FlightSkeleton.tsx     # Loading placeholder
│   └── ShaderBackground.tsx  # CSS gradient orb background
├── lib/
│   ├── flights.ts             # AviationStack fetch, in-memory cache, mock fallback
│   ├── opensky.ts             # OpenSky live aircraft positions and track history
│   └── utils.ts               # cn(), date formatting helpers
└── types.ts                   # Flight, ApiResponse, AviationStack API interfaces
```

---

## Mock Data Fallback

If `AVIATIONSTACK_API_KEY` is not set, or if the AviationStack API returns an error, the app automatically serves a built-in dataset of 8 flights. These cover common edge cases:

| Flight | Route | Notes |
|--------|-------|-------|
| `AA123` | JFK → LAX | Standard same-day |
| `UA456` | LAX → ORD | Crosses midnight |
| `JL001` | SFO → HND | Crosses International Date Line (+1) |
| `DL789` | ATL → MIA | Delayed (45 min) |
| `EK202` | JFK → DXB | Long-haul overnight (+1) |
| `WN101` | DAL → HOU | Cancelled |
| `BA112` | JFK → LHR | Transatlantic overnight (+1) |

---

## Deployment

### Vercel (recommended)

1. Push this repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Under **Environment Variables**, add:

   | Name | Value |
   |------|-------|
   | `AVIATIONSTACK_API_KEY` | Your AviationStack API key |

4. Click **Deploy**. Vercel auto-detects Next.js — no extra configuration needed.

> The app works without an API key; it falls back to the built-in mock flights automatically.
