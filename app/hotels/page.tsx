"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Booking, ScheduleData, Trip } from "@/lib/types";
import { ROSTER } from "@/lib/roster";
import { fetchBookings, removeBooking, saveBooking } from "@/lib/bookings";
import { formatRange, mapsUrl, todayYmd } from "@/lib/format";

export default function HotelsPage() {
  return (
    <Suspense fallback={<div className="loading">Loading…</div>}>
      <HotelsInner />
    </Suspense>
  );
}

function HotelsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"hotel" | "player">("hotel");
  const [editing, setEditing] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshBookings = () =>
    fetchBookings()
      .then(setBookings)
      .catch(() => setError("Could not load hotel bookings."));

  useEffect(() => {
    fetch("/api/events")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load the team schedule.");
        return r.json();
      })
      .then(setSchedule)
      .catch((e) => setError(e.message));
    refreshBookings();
  }, []);

  const trips = schedule?.trips ?? [];
  const today = todayYmd();
  const defaultTrip =
    trips.find((t) => t.endDate >= today) ?? trips[trips.length - 1];
  const selectedId = searchParams.get("trip") ?? defaultTrip?.id;
  const trip = trips.find((t) => t.id === selectedId) ?? defaultTrip;

  const tripBookings = useMemo(
    () => (bookings ?? []).filter((b) => trip && b.trip_id === trip.id),
    [bookings, trip]
  );

  if (error) return <div className="error-box card">{error}</div>;
  if (!schedule || !bookings)
    return <div className="loading">Loading roster &amp; hotels…</div>;
  if (!trip)
    return (
      <div className="card loading">No away trips found on the schedule.</div>
    );

  const bookingFor = (player: string) =>
    tripBookings.find((b) => b.player_name === player);

  const hotels = [...new Set(tripBookings.map((b) => b.hotel_name))];
  const unbooked = ROSTER.filter((p) => !bookingFor(p.name));

  const startEdit = (player: string) => {
    setSaveError(null);
    setEditing(player);
  };

  const submitEdit = async (
    player: string,
    hotel: string,
    notes: string
  ) => {
    setBusy(true);
    setSaveError(null);
    try {
      if (hotel.trim()) {
        await saveBooking({
          trip_id: trip.id,
          player_name: player,
          hotel_name: hotel.trim(),
          notes: notes.trim(),
        });
      } else {
        await removeBooking(trip.id, player);
      }
      await refreshBookings();
      setEditing(null);
    } catch {
      setSaveError("Save failed — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const clearBooking = async (player: string) => {
    setBusy(true);
    try {
      await removeBooking(trip.id, player);
      await refreshBookings();
      setEditing(null);
    } catch {
      setSaveError("Could not remove the booking — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>Roster &amp; Hotels</h1>
      <p className="page-sub">
        Pick a trip, then add the hotel your family is staying at. Switch to
        “By Hotel” to see who is staying where.
      </p>

      <div className="trip-strip">
        {trips.map((t) => (
          <button
            key={t.id}
            className={
              "trip-card card" + (t.id === trip.id ? " selected" : "")
            }
            style={{ textAlign: "left", cursor: "pointer", font: "inherit" }}
            onClick={() => {
              setEditing(null);
              router.replace(`/hotels?trip=${t.id}`, { scroll: false });
            }}
          >
            <div className="trip-card-name">{t.name}</div>
            <div className="trip-card-place">{t.place}</div>
            <div className="trip-card-dates">
              {formatRange(t.startDate, t.endDate)}
            </div>
            <div className="trip-card-meta">
              <span className="badge badge-booked">
                {(bookings ?? []).filter((b) => b.trip_id === t.id).length} of{" "}
                {ROSTER.length} booked
              </span>
            </div>
          </button>
        ))}
      </div>

      <TripHeader trip={trip} />

      <div className="section-title">
        <div className="view-toggle">
          <button
            className={view === "hotel" ? "active" : ""}
            onClick={() => setView("hotel")}
          >
            By Hotel
          </button>
          <button
            className={view === "player" ? "active" : ""}
            onClick={() => setView("player")}
          >
            By Player
          </button>
        </div>
      </div>

      {saveError && <div className="save-error">{saveError}</div>}

      {view === "hotel" ? (
        <>
          {hotels.length === 0 && (
            <div className="card loading">
              No hotels yet for this trip — switch to “By Player” to add
              yours first.
            </div>
          )}
          {hotels.map((hotel) => {
            const stayers = tripBookings.filter(
              (b) => b.hotel_name === hotel
            );
            return (
              <div key={hotel} className="hotel-group card">
                <div className="hotel-group-header">
                  <span className="hotel-name">🏨 {hotel}</span>
                  <span className="hotel-count">
                    {stayers.length}{" "}
                    {stayers.length === 1 ? "family" : "families"}
                  </span>
                </div>
                <div className="chip-row">
                  {stayers.map((b) => {
                    const p = ROSTER.find((r) => r.name === b.player_name);
                    return (
                      <span key={b.id} className="player-chip">
                        <span className="num">#{p?.number ?? "–"}</span>
                        {b.player_name}
                        {b.notes && (
                          <span className="chip-note">· {b.notes}</span>
                        )}
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
      ) : (
        <table className="roster-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Hotel</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ROSTER.map((p) => {
              const b = bookingFor(p.name);
              const isEditing = editing === p.name;
              return (
                <tr key={p.name}>
                  <td className="num-cell">{p.number}</td>
                  <td>{p.name}</td>
                  <td>
                    {isEditing ? (
                      <EditForm
                        initialHotel={b?.hotel_name ?? ""}
                        initialNotes={b?.notes ?? ""}
                        hotelOptions={hotels}
                        busy={busy}
                        onSave={(hotel, notes) =>
                          submitEdit(p.name, hotel, notes)
                        }
                        onCancel={() => setEditing(null)}
                        onRemove={b ? () => clearBooking(p.name) : undefined}
                      />
                    ) : b ? (
                      <>
                        <strong>{b.hotel_name}</strong>
                        {b.notes && (
                          <span className="chip-note"> · {b.notes}</span>
                        )}
                      </>
                    ) : (
                      <span className="no-hotel">No hotel yet</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {!isEditing && (
                      <button
                        className="btn-ghost"
                        onClick={() => startEdit(p.name)}
                      >
                        {b ? "Edit" : "Add hotel"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

function TripHeader({ trip }: { trip: Trip }) {
  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div className="event-title" style={{ fontSize: 17 }}>
        {trip.name}
        {trip.multiDay && (
          <span className="badge badge-tournament">Multi-day</span>
        )}
        <span className="badge badge-away">{trip.place}</span>
      </div>
      <div className="event-location" style={{ marginTop: 6 }}>
        {formatRange(trip.startDate, trip.endDate)}
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
  );
}

function EditForm({
  initialHotel,
  initialNotes,
  hotelOptions,
  busy,
  onSave,
  onCancel,
  onRemove,
}: {
  initialHotel: string;
  initialNotes: string;
  hotelOptions: string[];
  busy: boolean;
  onSave: (hotel: string, notes: string) => void;
  onCancel: () => void;
  onRemove?: () => void;
}) {
  const [hotel, setHotel] = useState(initialHotel);
  const [notes, setNotes] = useState(initialNotes);
  return (
    <div className="edit-form">
      <input
        list="hotel-options"
        placeholder="Hotel name"
        value={hotel}
        onChange={(e) => setHotel(e.target.value)}
        autoFocus
      />
      <datalist id="hotel-options">
        {hotelOptions.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>
      <input
        placeholder="Notes (optional — nights, room block…)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button
        className="btn btn-primary"
        disabled={busy || !hotel.trim()}
        onClick={() => onSave(hotel, notes)}
      >
        {busy ? "Saving…" : "Save"}
      </button>
      <button className="btn" disabled={busy} onClick={onCancel}>
        Cancel
      </button>
      {onRemove && (
        <button className="btn-ghost" disabled={busy} onClick={onRemove}>
          Remove
        </button>
      )}
    </div>
  );
}
