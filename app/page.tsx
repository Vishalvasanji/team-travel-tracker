"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Booking, ScheduleData, Trip } from "@/lib/types";
import { usePlayer } from "@/lib/player";
import { fetchBookings } from "@/lib/bookings";
import { formatDate, formatRange, formatTime, todayYmd } from "@/lib/format";

export default function AwayGamesPage() {
  const player = usePlayer();
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
    fetchBookings(player)
      .then(setBookings)
      .catch(() => {});
  }, [player]);

  if (error) return <div className="error-box card">{error}</div>;
  if (!data) return <div className="loading">Loading away games…</div>;

  const today = todayYmd();
  const upcoming = data.trips.filter((t) => t.endDate >= today);
  const past = data.trips.filter((t) => t.endDate < today);

  const statusFor = (trip: Trip): "booked" | "no_hotel" | "none" => {
    const b = bookings.find(
      (x) => x.trip_id === trip.id && x.player_name === player
    );
    if (!b) return "none";
    return b.no_hotel ? "no_hotel" : "booked";
  };

  return (
    <>
      <h1>Away Games &amp; Tournaments</h1>
      <p className="page-sub">
        Live from the PlayMetrics schedule, synced hourly. Tap a game to see
        team hotels and book yours.
      </p>

      {upcoming.length === 0 && (
        <div className="card loading">No upcoming away trips on the schedule.</div>
      )}

      <div className="trip-list">
        {upcoming.map((t) => (
          <TripCard key={t.id} trip={t} status={statusFor(t)} />
        ))}
      </div>

      {past.length > 0 && (
        <>
          <div className="section-title">Past trips</div>
          <div className="trip-list">
            {past.map((t) => (
              <TripCard key={t.id} trip={t} status={statusFor(t)} past />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function TripCard({
  trip,
  status,
  past = false,
}: {
  trip: Trip;
  status: "booked" | "no_hotel" | "none";
  past?: boolean;
}) {
  return (
    <Link
      href={`/trip/${trip.id}`}
      className="trip-row card trip-link"
      style={past ? { opacity: 0.75 } : undefined}
    >
      <div className="trip-row-main">
        <div className="event-title" style={{ fontSize: 16 }}>
          {trip.name}
          <span className="badge badge-place">{trip.place}</span>
          {status === "booked" && (
            <span className="badge badge-booked">✓ Booked</span>
          )}
          {status === "no_hotel" && (
            <span className="badge badge-place">No hotel needed</span>
          )}
          {status === "none" && !past && (
            <span className="badge badge-need">Needs hotel</span>
          )}
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
