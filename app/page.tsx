"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Booking, ScheduleData, Trip } from "@/lib/types";
import { usePlayer } from "@/lib/player";
import { fetchBookings } from "@/lib/bookings";
import { formatDate, formatRange, formatTime, todayYmd } from "@/lib/format";
import {
  CarIcon,
  HotelIcon,
  PlaneIcon,
  statusClass,
  type PlanStatus,
} from "@/lib/icons";

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

  const statusFor = (
    trip: Trip
  ): { hotel: PlanStatus; flight: PlanStatus; car: PlanStatus } => {
    const b = bookings.find(
      (x) => x.trip_id === trip.id && x.player_name === player
    );
    // Hotel defaults to "needs attention"; flight and driving are opt-in.
    if (!b) return { hotel: "pending", flight: "off", car: "off" };
    return {
      hotel: b.no_hotel ? "off" : b.hotel_name ? "done" : "pending",
      flight: b.flying ? (b.flight_number ? "done" : "pending") : "off",
      car: b.driving ? "done" : "off",
    };
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
  status: { hotel: PlanStatus; flight: PlanStatus; car: PlanStatus };
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
          {!past && (
            <span className="status-icons">
              <HotelIcon className={statusClass(status.hotel)} />
              <PlaneIcon className={statusClass(status.flight)} />
              <CarIcon className={statusClass(status.car)} />
            </span>
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
