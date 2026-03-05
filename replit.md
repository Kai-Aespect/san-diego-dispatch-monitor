# SD Dispatch Live - replit.md

## Overview

SD Dispatch Live is a real-time emergency dispatch monitoring dashboard for San Diego, CA. It scrapes live fire and police dispatch data from San Diego city web portals, geocodes incident locations, and presents them on an interactive dark-mode dashboard with a map view, incident list, filtering, notes/tagging, and audio notifications for new incidents.

Key capabilities:
- Scrapes fire incidents from the SD Fire Dispatch JSON API (`SDFireDispatch/api/v1/Incidents`)
- Scrapes police incidents from the SDPD Online dispatch portal (HTML scraping via cheerio)
- Geocodes addresses using the Nominatim (OpenStreetMap) API with rate limiting and in-memory caching
- Stores incidents and their change history in PostgreSQL via Drizzle ORM
- Polls and syncs data every 30 seconds on the server
- Frontend auto-refreshes every 30 seconds via TanStack Query
- Supports user annotations: notes, tags, and per-incident acknowledgment

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Monorepo Structure
The project uses a single-repo layout with three main areas:
- `client/` — React frontend (Vite, TypeScript)
- `server/` — Express backend (Node.js, TypeScript)
- `shared/` — Shared schema and API route definitions used by both sides

This avoids duplication of types and keeps API contracts in one place (`shared/schema.ts` and `shared/routes.ts`).

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter (lightweight client-side router); single main page at `/` (Dashboard), 404 fallback
- **State/Data Fetching**: TanStack Query (React Query) with 30-second polling intervals
- **UI Components**: shadcn/ui component library built on Radix UI primitives, styled with Tailwind CSS
- **Map**: Leaflet + react-leaflet with CartoDB Dark Matter tiles; custom SVG/HTML markers per agency/type
- **Geocoding (client-side)**: `use-geocode.ts` hook calls Nominatim directly from the browser for any incidents missing coordinates, with module-level caching and rate limiting
- **Audio Notifications**: Web Audio API (`AudioContext`) synthesizes a beep when new incidents appear; no external audio files needed
- **Theme**: Dark mode only, CSS variables defined in `index.css`, custom semantic color tokens for fire/police/medical/traffic

### Backend Architecture
- **Framework**: Express.js on Node.js with TypeScript, run via `tsx`
- **Entry point**: `server/index.ts` → `server/routes.ts` → `server/storage.ts`
- **Scraping**: `server/scraper.ts` fetches from SD city APIs on startup and every 30 seconds via `setInterval`. Uses cheerio for HTML-based police scraping and native fetch for the fire JSON API.
- **Geocoding (server-side)**: `server/geocoder.ts` geocodes any stored incidents without coordinates using Nominatim, with a 1.1-second rate limit enforced between requests and an in-memory cache.
- **Storage layer**: `server/storage.ts` defines a `DatabaseStorage` class implementing the `IStorage` interface. All DB access goes through this interface, making it easy to swap implementations.
- **Change Tracking**: On every upsert/update, the storage layer diffs tracked fields (`units`, `status`, `callType`, `isMajor`, `location`) and writes change records to the `incident_history` table.
- **Dev/Prod split**: In development, Vite middleware is wired into Express for HMR. In production, `server/static.ts` serves the pre-built client from `dist/public`.

### Shared Layer
- `shared/schema.ts` — Drizzle table definitions (`incidents`, `incidentHistory`), Zod insert schemas, and TypeScript types exported for both sides
- `shared/routes.ts` — Centralized API route paths, HTTP methods, Zod input/response schemas; consumed by both server route handlers and client hooks

### Database
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM (`drizzle-orm/node-postgres`) with `pg` pool
- **Schema management**: `drizzle-kit push` for schema migrations; config in `drizzle.config.ts`
- **Tables**:
  - `incidents` — All fields for a dispatch event including agency, call type, family, location, coordinates, units (JSONB), tags (JSONB), notes, acknowledged flag, timestamps
  - `incident_history` — Per-incident change log with field-level old/new values stored as JSONB

### Build
- Client: Vite → `dist/public`
- Server: esbuild bundles `server/index.ts` → `dist/index.cjs`, with a curated allowlist of deps bundled for faster cold starts; other deps are externalized

---

## External Dependencies

### APIs & Data Sources
- **SD Fire Dispatch API**: `https://webapps.sandiego.gov/SDFireDispatch/api/v1/Incidents` — JSON, no auth required
- **SD Police Dispatch Portal**: `https://webapps.sandiego.gov/sdpdonline/` — HTML, scraped with cheerio
- **Nominatim (OpenStreetMap)**: `https://nominatim.openstreetmap.org/search` — Free geocoding; rate-limited to ~1 req/sec per their ToS; used on both server and client

### Map Tiles
- **CartoDB Dark Matter**: Loaded via Leaflet tile layer URL at runtime; no API key required

### Fonts
- Google Fonts: Inter, JetBrains Mono, Outfit — loaded via CDN in `index.css`
- Leaflet CSS: Loaded via unpkg CDN in `index.css`

### Key npm Dependencies
| Package | Purpose |
|---|---|
| `drizzle-orm` + `pg` | PostgreSQL ORM and driver |
| `drizzle-zod` | Auto-generate Zod schemas from Drizzle tables |
| `cheerio` | Server-side HTML scraping for police dispatch |
| `react-leaflet` + `leaflet` | Interactive incident map |
| `@tanstack/react-query` | Data fetching, caching, polling |
| `wouter` | Lightweight client-side routing |
| `date-fns` | Date formatting and time-distance calculations |
| `zod` | Runtime validation on both server and client |
| `express` | HTTP server |
| `tsx` | TypeScript execution for dev server |
| `vite` | Frontend build and dev server |
| shadcn/ui + Radix UI | Accessible UI primitives |
| Tailwind CSS | Utility-first styling |

### Environment Variables
- `DATABASE_URL` — Required. PostgreSQL connection string. Must be set before running; both `server/db.ts` and `drizzle.config.ts` throw if missing.