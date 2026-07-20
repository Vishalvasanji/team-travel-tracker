"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Booking, ScheduleData, Trip } from "@/lib/types";
import { ROSTER } from "@/lib/roster";
import { fetchBookings, removeBooking, saveBooking } from "@/lib/bookings";
import { formatRange, mapsUrl, todayYmd } from "@/lib/format";

const PLAYER_STORAGE_KEY = "soccer-hotels-my-player";

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
  const [view, setView] = useState<"hotel" | "player" | "mine">("hotel");
  const [myPlayer, setMyPlayer] = useState("");
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
    const saved = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (saved) setMyPlayer(saved);
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

  const bookingFor = (tripId: string, player: string) =>
    (bookings ?? []).find(
      (b) => b.trip_id === tripId && b.player_name === player
    );

  const hotelsForTrip = (tripId: string) => [
    ...new Set(
      (bookings ?? [])
        .filter((b) => b.trip_id === tripId)
        .map((b) => b.hotel_name)
    ),
  ];

  const hotels = hotelsForTrip(trip.id);
  const unbooked = ROSTER.filter((p) => !bookingFor(trip.id, p.name));

  const startEdit = (key: string) => {
    setSaveError(null);
    setEditing(key);
  };

  const submitEdit = async (
    tripId: string,
    player: string,
    hotel: string,
    notes: string
  ) => {
    setBusy(true);
    setSaveError(null);
    try {
      if (hotel.trim()) {
        await saveBooking({
          trip_id: tripId,
          player_name: player,
          hotel_name: hotel.trim(),
          notes: notes.trim(),
        });
      } else {
        await removeBooking(tripId, player);
      }
      await refreshBookings();
      setEditing(null);
    } catch {
      setSaveError("Save failed — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const clearBooking = async (tripId: string, player: string) => {
    setBusy(true);
    try {
      await removeBooking(tripId, player);
      await refreshBookings();
      setEditing(null);
    } catch {
      setSaveError("Could not remove the booking — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const pickMyPlayer = (name: string) => {
    setMyPlayer(name);
    setEditing(null);
    localStorage.setItem(PLAYER_STORAGE_KEY, name);
  };

  return (
    <>
      <h1>Roster &amp; Hotels</h1>
      <p className="page-sub">
        Pick a trip and add the hotel your family is staying at — or open “My
        Bookings” to organize your player&apos;s hotels across every away
        trip.
      </p>

      <div className="section-title" style={{ marginTop: 0 }}>
        <div className="view-toggle">
          <button
            className={view === "hotel" ? "active" : ""}
            onClick={() => {
              setEditing(null);
              setView("hotel");
            }}
          >
            By Hotel
          </button>
          <button
            className={view === "player" ? "active" : ""}
            onClick={() => {
              setEditing(null);
              setView("player");
            }}
          >
            By Player
          </button>
          <button
            className={view === "mine" ? "active" : ""}
            onClick={() => {
              setEditing(null);
              setView("mine");
            }}
          >
            My Bookings
          </button>
        </div>
      </div>

      {saveError && <div className="save-error">{saveError}</div>}

      {view === "mine" ? (
        <MyBookings
          trips={trips}
          myPlayer={myPlayer}
          onPickPlayer={pickMyPlayer}
          bookingFor={bookingFor}
          hotelsForTrip={hotelsForTrip}
          editing={editing}
          startEdit={startEdit}
          cancelEdit={() => setEditing(null)}
          submitEdit={submitEdit}
          clearBooking={clearBooking}
          busy={busy}
          today={today}
        />
      ) : (
        <>
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
                    {(bookings ?? []).filter((b) => b.trip_id === t.id).length}{" "}
                    of {ROSTER.length} booked
                  </span>
                </div>
              </button>
            ))}
          </div>

          <TripHeader trip={trip} />

          {view === "hotel" ? (
            <div style={{ marginTop: 16 }}>
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
                        const p = ROSTER.find(
                          (r) => r.name === b.player_name
                        );
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
                <div
                  className="hotel-group card"
                  style={{ borderStyle: "dashed" }}
                >
                  <div className="hotel-group-header">
                    <span className="hotel-name">No hotel yet</span>
                    <span className="hotel-count">
                      {unbooked.length}{" "}
                      {unbooked.length === 1 ? "player" : "players"}
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
            </div>
          ) : (
            <table className="roster-table" style={{ marginTop: 16 }}>
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
                  const b = bookingFor(trip.id, p.name);
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
                              submitEdit(trip.id, p.name, hotel, notes)
                            }
                            onCancel={() => setEditing(null)}
                            onRemove={
                              b
                                ? () => clearBooking(trip.id, p.name)
                                : undefined
                            }
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
      )}
    </>
  );
}

function MyBookings({
  trips,
  myPlayer,
  onPickPlayer,
  bookingFor,
  hotelsForTrip,
  editing,
  startEdit,
  cancelEdit,
  submitEdit,
  clearBooking,
  busy,
  today,
}: {
  trips: Trip[];
  myPlayer: string;
  onPickPlayer: (name: string) => void;
  bookingFor: (tripId: string, player: string) => Booking | undefined;
  hotelsForTrip: (tripId: string) => string[];
  editing: string | null;
  startEdit: (key: string) => void;
  cancelEdit: () => void;
  submitEdit: (
    tripId: string,
    player: string,
    hotel: string,
    notes: string
  ) => void;
  clearBooking: (tripId: string, player: string) => void;
  busy: boolean;
  today: string;
}) {
  const upcoming = trips.filter((t) => t.endDate >= today);
  const past = trips.filter((t) => t.endDate < today);
  const booked = myPlayer
    ? trips.filter((t) => bookingFor(t.id, myPlayer)).length
    : 0;

  return (
    <>
      <div className="card" style={{ padding: "14px 16px", marginBottom: 16 }}>
        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            fontWeight: 600,
          }}
        >
          My player:
          <select
            className="btn"
            value={myPlayer}
            onChange={(e) => onPickPlayer(e.target.value)}
            style={{ cursor: "pointer" }}
          >
            <option value="">Select your player…</option>
            {ROSTER.map((p) => (
              <option key={p.name} value={p.name}>
                #{p.number} {p.name}
              </option>
            ))}
          </select>
          {myPlayer && (
            <span className="badge badge-booked">
              {booked} of {trips.length} trips booked
            </span>
          )}
        </label>
      </div>

      {!myPlayer ? (
        <div className="card loading">
          Choose your player above to see every away trip and which hotels
          you&apos;ve booked. Your choice is remembered on this device.
        </div>
      ) : (
        <>
          {[
            { label: "Upcoming trips", list: upcoming },
            { label: "Past trips", list: past },
          ].map(
            ({ label, list }) =>
              list.length > 0 && (
                <div key={label}>
                  <div className="section-title">{label}</div>
                  <div className="event-list">
                    {list.map((t) => {
                      const b = bookingFor(t.id, myPlayer);
                      const isEditing = editing === t.id;
                      return (
                        <div key={t.id} className="event-row card">
                          <div className="event-date-block">
                            {formatRange(t.startDate, t.endDate)}
                            <div className="event-time">{t.place}</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="event-title">
                              {t.name}
                              {b ? (
                                <span className="badge badge-booked">
                                  Booked
                                </span>
                              ) : (
                                <span className="badge badge-away">
                                  Needs hotel
                                </span>
                              )}
                            </div>
                            {isEditing ? (
                              <div style={{ marginTop: 8 }}>
                                <EditForm
                                  initialHotel={b?.hotel_name ?? ""}
                                  initialNotes={b?.notes ?? ""}
                                  hotelOptions={hotelsForTrip(t.id)}
                                  busy={busy}
                                  onSave={(hotel, notes) =>
                                    submitEdit(t.id, myPlayer, hotel, notes)
                                  }
                                  onCancel={cancelEdit}
                                  onRemove={
                                    b
                                      ? () => clearBooking(t.id, myPlayer)
                                      : undefined
                                  }
                                />
                              </div>
                            ) : (
                              <div className="event-location">
                                {b ? (
                                  <>
                                    🏨 <strong>{b.hotel_name}</strong>
                                    {b.notes && (
                                      <span className="chip-note">
                                        {" "}
                                        · {b.notes}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="no-hotel">
                                    No hotel saved for this trip yet
                                  </span>
                                )}{" "}
                                <button
                                  className="btn-ghost"
                                  onClick={() => startEdit(t.id)}
                                >
                                  {b ? "Edit" : "Add hotel"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
          )}
        </>
      )}
    </>
  );
}

function TripHeader({ trip }: { trip: Trip }) {
  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div className="event-title" style={{ fontSize: 17 }}>
        {trip.name}
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
