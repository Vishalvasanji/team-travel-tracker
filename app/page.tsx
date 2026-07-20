"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ScheduleData, Trip } from "@/lib/types";
import { formatDate, formatRange, formatTime, todayYmd } from "@/lib/format";

export default function AwayGamesPage() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load the team schedule.");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-box card">{error}</div>;
  if (!data) return <div className="loading">Loading away games…</div>;

  const today = todayYmd();
  const upcoming = data.trips.filter((t) => t.endDate >= today);
  const past = data.trips.filter((t) => t.endDate < today);

  return (
    <>
      <h1>Away Games &amp; Tournaments</h1>
      <p className="page-sub">
        Live from the PlayMetrics schedule, synced hourly. Tap a game to see
        team hotels and add yours.
      </p>

      {upcoming.length === 0 && (
        <div className="card loading">No upcoming away trips on the schedule.</div>
      )}

      <div className="trip-list">
        {upcoming.map((t) => (
          <TripCard key={t.id} trip={t} />
        ))}
      </div>

      {past.length > 0 && (
        <>
          <div className="section-title">Past trips</div>
          <div className="trip-list">
            {past.map((t) => (
              <TripCard key={t.id} trip={t} past />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function TripCard({ trip, past = false }: { trip: Trip; past?: boolean }) {
  return (
    <Link
      href={`/trip/${trip.id}`}
      className="trip-row card trip-link"
      style={past ? { opacity: 0.75 } : undefined}
    >
      <div className="trip-row-main">
        <div className="event-title" style={{ fontSize: 16 }}>
          {trip.name}
          <span className="badge badge-away">{trip.place}</span>
        </div>
        <div className="trip-card-dates" style={{ margin: "4px 0 6px" }}>
          {formatRange(trip.startDate, trip.endDate)}
        </div>
        <div className="event-location">
          {trip.events.map((e) => (
            <div key={e.uid + e.date}>
              {formatDate(e.date)}
              {e.time ? ` · ${formatTime(e.time)}` : ""} — 📍 {e.location}
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
