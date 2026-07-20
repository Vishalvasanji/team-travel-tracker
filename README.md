# Louisiana Elite Soccer 14U — Away Games & Hotel Tracker

A small team website that keeps the whole squad on the same page for away
weekends:

- **Away Games** (`/`) — pulls the live PlayMetrics ICS feed (re-synced
  hourly) and lists every away game and tournament with opponent names,
  dates, and venues. Practices, home games, and canceled events are filtered
  out.
- **Game hub** (`/trip/[id]`) — tap any game card to see that trip's hub:
  venue map links, every hotel the team has booked with the players staying
  at each, who still needs a hotel, and a form for parents to add or update
  their own hotel (their player pick is remembered per device).

## Stack

- Next.js (App Router) on the **Vercel free tier**
- **Turso free tier** (libSQL/SQLite) stores hotel bookings — table
  `hotel_bookings`, one row per player per trip, created automatically on
  first use. Browsers never call the database directly; everything goes
  through `/api/bookings` on the same origin.
- Only runtime dependency beyond Next/React is `@libsql/client`; the ICS
  parser is ~60 lines in `lib/schedule.ts`

## Configuration

| Variable | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL` | Turso database URL (`libsql://…`). **Required in production**; local dev falls back to a `file:local.db` SQLite file |
| `TURSO_AUTH_TOKEN` | Turso database auth token (required with a `libsql://` URL) |
| `PLAYMETRICS_ICS_URL` | Optional override for the team calendar feed URL |

To create the database on Turso's free tier:

```bash
turso db create soccer-hotels
turso db show soccer-hotels --url        # → TURSO_DATABASE_URL
turso db tokens create soccer-hotels     # → TURSO_AUTH_TOKEN
```

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
