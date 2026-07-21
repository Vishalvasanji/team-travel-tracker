"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  Attendance,
  Booking,
  PlayerParent,
  ScheduleData,
  Trip,
} from "@/lib/types";
import { usePlayer } from "@/lib/player";
import {
  fetchAttendance,
  fetchBookings,
  fetchParents,
} from "@/lib/bookings";
import { formatDate, formatRange, formatTime, todayYmd } from "@/lib/format";
import {
  CarIcon,
  HotelIcon,
  PersonIcon,
  PlaneIcon,
  statusClass,
  type PlanStatus,
} from "@/lib/icons";

export default function AwayGamesPage() {
  const player = usePlayer();
  const [data, setData] = useState<ScheduleData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [parents, setParents] = useState<PlayerParent[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
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
    fetchParents()
      .then(setParents)
      .catch(() => {});
    fetchAttendance()
      .then(setAttendance)
      .catch(() => {});
  }, [player]);

  if (error) return <div className="error-box card">{error}</div>;
  if (!data) return <div className="loading">Loading away games…</div>;

  const today = todayYmd();
  const upcoming = data.trips.filter((t) => t.endDate >= today);
  const past = data.trips.filter((t) => t.endDate < today);

  const statusFor = (
    trip: Trip
  ): {
    person: PlanStatus;
    hotel: PlanStatus;
    flight: PlanStatus;
    car: PlanStatus;
  } => {
    const b = bookings.find(
      (x) => x.trip_id === trip.id && x.player_name === player
    );
    // Household attendance: green if anyone's going, gray only when every
    // known parent answered "not going", yellow otherwise.
    const myParents = parents.filter((p) => p.player_name === player);
    const answers = attendance.filter(
      (a) => a.trip_id === trip.id && a.player_name === player
    );
    const person: PlanStatus = answers.some((a) => a.going)
      ? "done"
      : myParents.length > 0 &&
          myParents.every((p) =>
            answers.some((a) => a.parent_name === p.parent_name && !a.going)
          )
        ? "off"
        : "pending";
    // Hotel defaults to "needs attention"; flight and driving are opt-in.
    const rest = !b
      ? { hotel: "pending" as PlanStatus, flight: "off" as PlanStatus, car: "off" as PlanStatus }
      : {
          hotel: (b.no_hotel ? "off" : b.hotel_name ? "done" : "pending") as PlanStatus,
          flight: (b.flying ? (b.flight_number ? "done" : "pending") : "off") as PlanStatus,
          // A ride with another family counts as travel handled.
          car: (b.driving || b.riding_with ? "done" : "off") as PlanStatus,
        };
    return { person, ...rest };
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
  status: {
    person: PlanStatus;
    hotel: PlanStatus;
    flight: PlanStatus;
    car: PlanStatus;
  };
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
              <PersonIcon className={statusClass(status.person)} />
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
