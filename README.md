# BRSC U14 Elite Girls — Away Games & Hotel Tracker

A small team website that keeps the whole squad on the same page for away
weekends:

- **Calendar** (`/`) — pulls the live PlayMetrics ICS feed (re-synced hourly),
  shows games, tournaments, and (optionally) practices in a month view, and
  highlights everything that's away from Baton Rouge. Canceled events are
  filtered out.
- **Roster & Hotels** (`/hotels`) — away games/tournaments on back-to-back days
  are grouped into "trips" (e.g. the Pensacola + Daphne weekend). Parents pick
  the trip, add the hotel their family booked, and everyone can flip to the
  **By Hotel** view to see who is staying where.

## Stack

- Next.js (App Router) on the **Vercel free tier**
- **Supabase free tier** (Postgres) stores hotel bookings via the PostgREST
  API — table `hotel_bookings`, one row per player per trip, guarded by RLS
  policies scoped to the anon key. Browsers never call Supabase directly;
  everything goes through `/api/bookings` on the same origin.
- No other dependencies; the ICS parser is ~60 lines in `lib/schedule.ts`

## Configuration

Everything works out of the box; optional env vars override the defaults:

| Variable | Purpose |
| --- | --- |
| `PLAYMETRICS_ICS_URL` | Team calendar feed URL |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon (publishable) key |

The roster lives in `lib/roster.ts` — edit that file when players join or
leave.

## Notes on trip IDs

A trip's ID is derived from its start date and city
(`2026-10-09-northern-virginia`), so hotel entries survive re-syncs of the
feed. If a tournament's *date* changes in PlayMetrics, re-enter hotels for the
new date.

## Phase 2 (planned)

Live hotel pricing sorted by distance to the field: each trip already carries
its venue addresses, so the next step is geocoding those and querying a hotel
price API for nearby availability.

## Local development

```bash
npm install
npm run dev
```
