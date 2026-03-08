# SD Dispatch Live - replit.md

## Overview

SD Dispatch Live is a real-time emergency dispatch monitoring dashboard for San Diego, CA. It scrapes live fire and police dispatch data from San Diego city web portals, geocodes incident locations, and presents them on an interactive dashboard with a map view, incident list, filtering, notes/tagging, bookmarks, personal cloud notes, an admin info board, and audio notifications.

Key capabilities:
- Scrapes fire incidents from the SD Fire Dispatch JSON API (`SDFireDispatch/api/v1/Incidents`)
- Scrapes police incidents from the SDPD Online dispatch portal (HTML scraping via cheerio); police page times are in Pacific time (America/Los_Angeles) and are correctly offset to UTC via `parsePacificTime()` in scraper.ts
- Geocodes addresses using the Nominatim (OpenStreetMap) API with rate limiting and in-memory caching
- Stores incidents and their change history in PostgreSQL via Drizzle ORM
- Polls and syncs data every 60 seconds on the server
- Frontend auto-refreshes every 60s (free) or 30s (Pro) via TanStack Query
- Supports user annotations: notes, tags, and per-incident acknowledgment (Pro only)
- Personal cloud notes (Pro): per-user notes saved to DB via API
- Bookmarks (localStorage): track specific calls; they appear in the right side panel
- Admin info board: admin PIN 3232; locked cards require Pro subscription
- Settings: light/dark theme toggle, audio alert on/off, fast refresh toggle (Pro)
- 3-tone ascending beep for new/updated incidents

### Authentication & Subscriptions
- All visitors must create an account to access the dashboard
- Free accounts get: incident list, map, bookmarks, info board (non-locked), reference
- Dispatch Pro subscribers get: Personal Notes, call/unit note editing, Units panel, Stats panel, fast refresh, locked info board cards
- Pricing: Weekly $1.83, Monthly $5.43, Yearly $50.72 (includes Stripe processing fees)
- Stripe product ID: `prod_U6nupKx4N2doJv` (Dispatch Pro)
- Stripe price IDs: weekly `price_1T8aILPyfpGf4shhVcnGZVt5`, monthly `price_1T8aIOPyfpGf4shhU7ehbu0f`, yearly `price_1T8aIRPyfpGf4shhMIPR2mjf`
- Admin PIN: 3232 (for /admin panel only)

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Monorepo Structure
- `client/` — React frontend (Vite, TypeScript)
- `server/` — Express backend (Node.js, TypeScript)
- `shared/` — Shared schema and API route definitions

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter; single main page at `/` (Dashboard)
- **State/Data Fetching**: TanStack Query with 5-second polling intervals
- **UI Components**: shadcn/ui on Radix UI primitives, styled with Tailwind CSS
- **Map**: Leaflet + react-leaflet with CartoDB Dark Matter tiles
- **Geocoding (client-side)**: `use-geocode.ts` hook calls Nominatim from the browser
- **Audio Notifications**: Web Audio API synthesizes a 3-tone ascending beep (440→660→880 Hz) when new/updated incidents detected
- **Theme**: Dark/Light mode via `.dark`/`.light` CSS class on `<html>`, toggled in settings; persisted to localStorage via `use-settings.ts`
- **Local Notes**: `use-local-notes.ts` + localStorage; cards with colors, pin, link-to-call
- **Bookmarks**: `use-bookmarks.ts` + localStorage; bookmark any call, view in "Tracked" tab
- **Settings**: `use-settings.ts` + localStorage; theme and volume controls

### Layout (3-panel, resizable)
- Left: Incidents list (default 420px, min 240px, max 640px) with drag-handle resize
- Middle: Map (flex-1, takes remaining space)
- Right: Side panel (default 320px, min 48px, max 520px) with drag-handle resize
  - Auto-collapses to icon-only mode when width < 100px
  - Clicking any icon while collapsed re-expands to 320px
  - Tabs: **Tracked**, **My Notes**, **Info**, **Settings**
- Resize handles: 6px draggable dividers between panels, triggered by mouse drag
- Local Notes: drag-to-reorder via @dnd-kit/core + @dnd-kit/sortable; GripVertical handles
- Incident cards show `callTypeFamily` as monospace subtitle below `callType` when different

### Backend Architecture
- **Framework**: Express.js on Node.js with TypeScript, run via `tsx`
- **Scraping**: `server/scraper.ts` fetches from SD city APIs on startup and every 5 seconds
- **Storage layer**: `server/storage.ts` — DatabaseStorage class; separates system (lat/lng) from user changes in history
- **Change Tracking**: Diffs tracked fields; lat/lng changes are labelled "SYSTEM" in history, not "User"

### Shared Layer
- `shared/schema.ts` — Drizzle table definitions, Zod insert schemas, TypeScript types
- `shared/routes.ts` — Centralized API route paths, methods, Zod schemas

### Database
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with `pg` pool
- **Tables**:
  - `incidents` — All dispatch event fields
  - `incident_history` — Per-incident change log with field-level old/new values (JSONB)

---

## External Dependencies

### APIs & Data Sources
- **SD Fire Dispatch API**: `https://webapps.sandiego.gov/SDFireDispatch/api/v1/Incidents` — JSON, no auth
- **SD Police Dispatch Portal**: `https://webapps.sandiego.gov/sdpdonline/` — HTML, scraped with cheerio
- **Nominatim (OpenStreetMap)**: Free geocoding; rate-limited to ~1 req/sec

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
| shadcn/ui + Radix UI | Accessible UI primitives |
| Tailwind CSS | Utility-first styling |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag-to-reorder for local notes |

### Environment Variables
- `DATABASE_URL` — Required. PostgreSQL connection string.
- `SESSION_SECRET` — Required for session middleware.
