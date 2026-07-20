"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Booking, ScheduleData, Trip } from "@/lib/types";
import { ROSTER } from "@/lib/roster";
import { formatDate, formatRange, formatTime, mapsUrl, todayYmd } from "@/lib/format";

export default function AwayGamesPage() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load the team schedule.");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
    // Booked counts are a nice-to-have here; ignore failures quietly.
    fetch("/api/bookings")
      .then((r) => (r.ok ? r.json() : []))
      .then(setBookings)
      .catch(() => {});
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
        Live from the PlayMetrics schedule, synced hourly. Tap a trip to plan
        hotels with the rest of the team.
      </p>

      {upcoming.length === 0 && (
        <div className="card loading">No upcoming away trips on the schedule.</div>
      )}

      <div className="trip-list">
        {upcoming.map((t) => (
          <TripCard key={t.id} trip={t} bookings={bookings} />
        ))}
      </div>

      {past.length > 0 && (
        <>
          <div className="section-title">Past trips</div>
          <div className="trip-list">
            {past.map((t) => (
              <TripCard key={t.id} trip={t} bookings={bookings} past />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function TripCard({
  trip,
  bookings,
  past = false,
}: {
  trip: Trip;
  bookings: Booking[];
  past?: boolean;
}) {
  const booked = bookings.filter((b) => b.trip_id === trip.id).length;
  return (
    <div className="trip-row card" style={past ? { opacity: 0.75 } : undefined}>
      <div className="trip-row-main">
        <div className="event-title" style={{ fontSize: 16 }}>
          {trip.name}
          {trip.multiDay && (
            <span className="badge badge-tournament">Multi-day</span>
          )}
          <span className="badge badge-away">{trip.place}</span>
        </div>
        <div className="trip-card-dates" style={{ margin: "4px 0 6px" }}>
          {formatRange(trip.startDate, trip.endDate)}
        </div>
        <div className="event-location">
          {trip.events.map((e) => (
            <div key={e.uid + e.date}>
              {formatDate(e.date)}
              {e.time ? ` · ${formatTime(e.time)}` : ""} — 📍{" "}
              <a href={mapsUrl(e.location)} target="_blank" rel="noreferrer">
                {e.location}
              </a>
            </div>
          ))}
        </div>
      </div>
      <div className="trip-row-side">
        <span className="badge badge-booked">
          {booked} of {ROSTER.length} booked
        </span>
        <Link href={`/hotels?trip=${trip.id}`} className="btn btn-primary">
          Plan hotels →
        </Link>
      </div>
    </div>
  );
}
