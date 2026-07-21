"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Booking, ScheduleData } from "@/lib/types";
import { ROSTER } from "@/lib/roster";
import { fetchBookings } from "@/lib/bookings";
import { formatRange, mapsUrl } from "@/lib/format";

export default function TripHubPage() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;

  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load the team schedule.");
        return r.json();
      })
      .then(setSchedule)
      .catch((e) => setError(e.message));
    fetchBookings()
      .then(setBookings)
      .catch(() => setError("Could not load hotel bookings."));
  }, []);

  const trip = schedule?.trips.find((t) => t.id === tripId);

  const tripBookings = useMemo(
    () => (bookings ?? []).filter((b) => b.trip_id === tripId),
    [bookings, tripId]
  );

  if (error) return <div className="error-box card">{error}</div>;
  if (!schedule || !bookings)
    return <div className="loading">Loading trip…</div>;
  if (!trip)
    return (
      <div className="card loading">
        Trip not found — it may have moved on the schedule.{" "}
        <Link href="/">Back to away games</Link>
      </div>
    );

  const hotels = [...new Set(tripBookings.map((b) => b.hotel_name))];
  const unbooked = ROSTER.filter(
    (p) => !tripBookings.some((b) => b.player_name === p.name)
  );

  return (
    <>
      <p style={{ margin: "0 0 14px" }}>
        <Link href="/" className="back-link">
          ← All away games
        </Link>
      </p>

      <div className="card" style={{ padding: "16px 18px", marginBottom: 22 }}>
        <div className="event-title" style={{ fontSize: 19 }}>
          {trip.name}
          <span className="badge badge-away">{trip.place}</span>
        </div>
        <div className="trip-card-dates" style={{ margin: "4px 0 6px" }}>
          {formatRange(trip.startDate, trip.endDate)}
        </div>
        <div className="event-location">
          {[...new Set(trip.events.map((e) => e.location))].map((location) => (
            <div key={location}>
              📍{" "}
              <a href={mapsUrl(location)} target="_blank" rel="noreferrer">
                {location}
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">
        🏨 Team hotels
        <span className="badge badge-booked">
          {tripBookings.length} of {ROSTER.length} booked
        </span>
      </div>

      {hotels.length === 0 && (
        <div className="card loading">No hotels booked for this trip yet.</div>
      )}
      {hotels.map((h) => {
        const stayers = tripBookings.filter((b) => b.hotel_name === h);
        return (
          <div key={h} className="hotel-group card">
            <div className="hotel-group-header">
              <span className="hotel-name">{h}</span>
              <span className="hotel-count">
                {stayers.length} {stayers.length === 1 ? "family" : "families"}
              </span>
            </div>
            <div className="chip-row">
              {stayers.map((b) => {
                const p = ROSTER.find((r) => r.name === b.player_name);
                return (
                  <span key={b.id} className="player-chip">
                    <span className="num">#{p?.number ?? "–"}</span>
                    {b.player_name}
                    {b.notes && <span className="chip-note">· {b.notes}</span>}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}

      {unbooked.length > 0 && (
        <div className="hotel-group card" style={{ borderStyle: "dashed" }}>
          <div className="hotel-group-header">
            <span className="hotel-name">No hotel yet</span>
            <span className="hotel-count">
              {unbooked.length} {unbooked.length === 1 ? "player" : "players"}
            </span>
          </div>
          <div className="chip-row">
            {unbooked.map((p) => (
              <span key={p.name} className="player-chip">
                <span className="num">#{p.number}</span>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
