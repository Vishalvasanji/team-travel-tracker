"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type {
  Attendance,
  Booking,
  PlayerParent,
  ScheduleData,
  TripLink,
  TripVenue,
} from "@/lib/types";
import { ROSTER } from "@/lib/roster";
import { usePlayer } from "@/lib/player";
import {
  addLink,
  addParent,
  clearAttendance,
  fetchAttendance,
  fetchBookings,
  fetchLinks,
  fetchParents,
  fetchVenues,
  removeLink,
  saveBooking,
  saveVenue,
  setAttendance,
} from "@/lib/bookings";
import { formatRange, mapsUrl } from "@/lib/format";

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizeFlight = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export default function TripHubPage() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;
  const player = usePlayer();

  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Hotel form
  const [hotelFormOpen, setHotelFormOpen] = useState(false);
  const [hotel, setHotel] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [placeResults, setPlaceResults] = useState<
    { name: string; address: string }[]
  >([]);
  const [placesPicked, setPlacesPicked] = useState(false);

  // Flight form
  const [flightFormOpen, setFlightFormOpen] = useState(false);
  const [flightNum, setFlightNum] = useState("");
  const [flightTime, setFlightTime] = useState("");
  const [flightConf, setFlightConf] = useState("");

  // Booking links
  const [links, setLinks] = useState<TripLink[]>([]);
  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Attendance
  const [parents, setParents] = useState<PlayerParent[]>([]);
  const [attendance, setAttendanceRows] = useState<Attendance[]>([]);
  const [newParentName, setNewParentName] = useState("");
  const [addParentOpen, setAddParentOpen] = useState(false);

  // Venue override
  const [venues, setVenues] = useState<TripVenue[]>([]);
  const [venueFormOpen, setVenueFormOpen] = useState(false);
  const [venueInput, setVenueInput] = useState("");
  const [venueBusy, setVenueBusy] = useState(false);
  const [venueError, setVenueError] = useState<string | null>(null);

  const refreshBookings = () =>
    fetchBookings(player)
      .then(setBookings)
      .catch(() => setError("Could not load travel plans."));

  useEffect(() => {
    fetch("/api/events")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load the team schedule.");
        return r.json();
      })
      .then(setSchedule)
      .catch((e) => setError(e.message));
    refreshBookings();
    fetchLinks()
      .then(setLinks)
      .catch(() => {});
    fetchVenues()
      .then(setVenues)
      .catch(() => {});
    fetchParents()
      .then(setParents)
      .catch(() => {});
    fetchAttendance()
      .then(setAttendanceRows)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  const trip = schedule?.trips.find((t) => t.id === tripId);
  const tripPlace = trip?.place ?? "";

  // Google Places hotel search near the trip's city, debounced while typing.
  useEffect(() => {
    if (!hotelFormOpen || placesPicked || hotel.trim().length < 3) {
      setPlaceResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: hotel.trim(), near: tripPlace });
      fetch(`/api/hotels?${params}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : { hotels: [] }))
        .then((d) => setPlaceResults(d.hotels ?? []))
        .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [hotel, hotelFormOpen, placesPicked, tripPlace]);

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

  const myBooking = tripBookings.find((b) => b.player_name === player);
  const hotelOn = !myBooking?.no_hotel;
  const flightOn = Boolean(myBooking?.flying);
  const drivingOn = Boolean(myBooking?.driving);

  const hotelBookings = tripBookings.filter(
    (b) => !b.no_hotel && b.hotel_name
  );
  const flightBookings = tripBookings.filter(
    (b) => b.flying && b.flight_number
  );
  const driverBookings = tripBookings.filter((b) => b.driving);
  const hotels = [...new Set(hotelBookings.map((b) => b.hotel_name))];
  const flights = [...new Set(flightBookings.map((b) => b.flight_number))];
  const needHotel = ROSTER.filter((p) => {
    const b = tripBookings.find((x) => x.player_name === p.name);
    return !b ? true : !b.no_hotel && !b.hotel_name;
  });

  const tripLinks = links.filter((l) => l.trip_id === trip.id);
  const tripVenue = venues.find((v) => v.trip_id === trip.id);

  const isVagueLocation = (location: string) =>
    location
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p && p.toUpperCase() !== "USA").length <= 2;

  const feedLocations = [...new Set(trip.events.map((e) => e.location))].filter(
    (l) => !tripVenue || !isVagueLocation(l)
  );
  const hasVagueFeed = trip.events.some((e) => isVagueLocation(e.location));

  // Merge a partial change into the full travel-plan row and save it.
  const savePlan = async (patch: Record<string, unknown>) => {
    setBusy(true);
    setSaveError(null);
    try {
      await saveBooking({
        trip_id: trip.id,
        player_name: player,
        hotel_name: myBooking?.hotel_name ?? "",
        confirmation_number: myBooking?.confirmation_number ?? "",
        no_hotel: Boolean(myBooking?.no_hotel),
        flying: Boolean(myBooking?.flying),
        driving: Boolean(myBooking?.driving),
        riding_with: myBooking?.riding_with ?? "",
        flight_number: myBooking?.flight_number ?? "",
        flight_time: myBooking?.flight_time ?? "",
        flight_conf: myBooking?.flight_conf ?? "",
        ...patch,
      });
      await refreshBookings();
      return true;
    } catch {
      setSaveError("Could not save — please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  // ---- attendance ----
  const myParents = parents.filter((p) => p.player_name === player);
  const tripAttendance = attendance.filter((a) => a.trip_id === trip.id);
  const attendanceFor = (playerName: string, parentName: string) =>
    tripAttendance.find(
      (a) => a.player_name === playerName && a.parent_name === parentName
    );

  const refreshAttendance = () =>
    fetchAttendance()
      .then(setAttendanceRows)
      .catch(() => {});

  const markAttendance = async (parentName: string, going: boolean) => {
    const current = attendanceFor(player, parentName);
    setBusy(true);
    setSaveError(null);
    try {
      if (current && Boolean(current.going) === going) {
        // Tapping the active state clears back to unanswered.
        await clearAttendance(trip.id, player, parentName);
      } else {
        await setAttendance({
          trip_id: trip.id,
          player_name: player,
          parent_name: parentName,
          going,
        });
      }
      await refreshAttendance();
    } catch {
      setSaveError("Could not save attendance — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitNewParent = async () => {
    if (!newParentName.trim()) return;
    setBusy(true);
    try {
      await addParent(player, newParentName.trim());
      setParents(await fetchParents());
      setNewParentName("");
      setAddParentOpen(false);
    } catch {
      setSaveError("Could not add the parent — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const goingByPlayer = new Map<string, string[]>();
  for (const a of tripAttendance) {
    if (a.going) {
      const list = goingByPlayer.get(a.player_name) ?? [];
      list.push(a.parent_name);
      goingByPlayer.set(a.player_name, list);
    }
  }

  // ---- carpools ----
  const riderBookings = tripBookings.filter(
    (b) => !b.driving && b.riding_with
  );
  const ridersFor = (driverPlayer: string) =>
    riderBookings.filter((b) => b.riding_with === driverPlayer);
  const orphanRiders = riderBookings.filter(
    (b) => !driverBookings.some((d) => d.player_name === b.riding_with)
  );
  const familyName = (playerName: string) =>
    playerName.split(" ").slice(-1)[0];

  const openHotelForm = () => {
    setHotel(myBooking?.hotel_name ?? "");
    setConfirmation(myBooking?.confirmation_number ?? "");
    setSaveError(null);
    setPlacesPicked(Boolean(myBooking?.hotel_name));
    setHotelFormOpen(true);
  };

  const saveHotel = async () => {
    if (!hotel.trim()) return;
    const typed = hotel.trim();
    const existing = hotels.find((h) => normalize(h) === normalize(typed));
    const ok = await savePlan({
      no_hotel: false,
      hotel_name: existing ?? typed,
      confirmation_number: confirmation.trim(),
    });
    if (ok) setHotelFormOpen(false);
  };

  const openFlightForm = () => {
    setFlightNum(myBooking?.flight_number ?? "");
    setFlightTime(myBooking?.flight_time ?? "");
    setFlightConf(myBooking?.flight_conf ?? "");
    setSaveError(null);
    setFlightFormOpen(true);
  };

  const saveFlight = async () => {
    if (!flightNum.trim()) return;
    const ok = await savePlan({
      flying: true,
      flight_number: normalizeFlight(flightNum),
      flight_time: flightTime.trim(),
      flight_conf: flightConf.trim(),
    });
    if (ok) setFlightFormOpen(false);
  };

  const flightSuggestions =
    flightFormOpen && flightNum.trim().length >= 2
      ? flights.filter((f) => {
          const a = normalizeFlight(f);
          const b = normalizeFlight(flightNum);
          return a !== b && (a.includes(b) || b.includes(a));
        })
      : [];

  const flightTimeFor = (num: string) =>
    flightBookings.find((b) => b.flight_number === num && b.flight_time)
      ?.flight_time ?? "";

  const submitLink = async () => {
    if (!linkUrl.trim()) return;
    setLinkBusy(true);
    setLinkError(null);
    const url = /^https?:\/\//i.test(linkUrl.trim())
      ? linkUrl.trim()
      : `https://${linkUrl.trim()}`;
    let label = "Link";
    try {
      label = new URL(url).hostname.replace(/^www\./, "");
    } catch {}
    try {
      await addLink({ trip_id: trip.id, label, url, added_by: player });
      setLinks(await fetchLinks());
      setLinkFormOpen(false);
      setLinkUrl("");
    } catch {
      setLinkError("Could not save the link — check the URL and try again.");
    } finally {
      setLinkBusy(false);
    }
  };

  const deleteLink = async (id: number) => {
    setLinkBusy(true);
    try {
      await removeLink(id);
      setLinks(await fetchLinks());
    } catch {
      setLinkError("Could not remove the link — please try again.");
    } finally {
      setLinkBusy(false);
    }
  };

  const openVenueForm = () => {
    setVenueInput(tripVenue?.venue ?? "");
    setVenueError(null);
    setVenueFormOpen(true);
  };

  const submitVenue = async () => {
    if (!venueInput.trim()) return;
    setVenueBusy(true);
    setVenueError(null);
    try {
      await saveVenue({
        trip_id: trip.id,
        venue: venueInput.trim(),
        added_by: player,
      });
      setVenues(await fetchVenues());
      setVenueFormOpen(false);
    } catch {
      setVenueError("Could not save the location — please try again.");
    } finally {
      setVenueBusy(false);
    }
  };

  const chip = (b: Booking) => {
    const p = ROSTER.find((r) => r.name === b.player_name);
    return (
      <span key={b.id} className="player-chip">
        <span className="num">#{p?.number ?? "–"}</span>
        {b.player_name}
      </span>
    );
  };

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
          <span className="badge badge-place">{trip.place}</span>
        </div>
        <div className="trip-card-dates" style={{ margin: "4px 0 6px" }}>
          {formatRange(trip.startDate, trip.endDate)}
        </div>
        <div className="event-location">
          {tripVenue && !venueFormOpen && (
            <div>
              📍{" "}
              <a
                href={mapsUrl(tripVenue.venue)}
                target="_blank"
                rel="noreferrer"
              >
                <strong>{tripVenue.venue}</strong>
              </a>
              {!tripVenue.added_by && (
                <span className="link-meta"> · usual venue from past years</span>
              )}{" "}
              <button className="btn-ghost" onClick={openVenueForm}>
                ✎ Edit
              </button>
            </div>
          )}
          {feedLocations.map((location) => (
            <div key={location}>
              📍{" "}
              <a href={mapsUrl(location)} target="_blank" rel="noreferrer">
                {location}
              </a>
            </div>
          ))}
          {!tripVenue && hasVagueFeed && !venueFormOpen && (
            <button className="btn-ghost" onClick={openVenueForm}>
              ＋ Set exact field location
            </button>
          )}
        </div>
        {venueFormOpen && (
          <div className="link-form" style={{ marginTop: 10 }}>
            <input
              placeholder="Field or park name / address"
              value={venueInput}
              onChange={(e) => setVenueInput(e.target.value)}
              autoFocus
            />
            <div className="link-form-actions">
              <button
                className="btn"
                disabled={venueBusy}
                onClick={() => setVenueFormOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={venueBusy || !venueInput.trim()}
                onClick={submitVenue}
              >
                {venueBusy ? "Saving…" : "Save"}
              </button>
            </div>
            {venueError && <div className="save-error">{venueError}</div>}
          </div>
        )}
      </div>

      {/* ---------- team view ---------- */}
      <div className="section-title">
        🏨 Team hotels
        <span className="badge badge-booked">
          {hotelBookings.length} of {ROSTER.length} booked
        </span>
      </div>
      {hotels.length === 0 && (
        <div className="card loading">No hotels booked for this trip yet.</div>
      )}
      {hotels.map((h) => {
        const stayers = hotelBookings.filter((b) => b.hotel_name === h);
        return (
          <div key={h} className="hotel-group card">
            <div className="hotel-group-header">
              <span className="hotel-name">{h}</span>
              <span className="hotel-count">
                {stayers.length} {stayers.length === 1 ? "family" : "families"}
              </span>
            </div>
            <div className="chip-row">{stayers.map(chip)}</div>
          </div>
        );
      })}
      {needHotel.length > 0 && (
        <div className="hotel-group card" style={{ borderStyle: "dashed" }}>
          <div className="hotel-group-header">
            <span className="hotel-name">No hotel yet</span>
            <span className="hotel-count">
              {needHotel.length} {needHotel.length === 1 ? "player" : "players"}
            </span>
          </div>
          <div className="chip-row">
            {needHotel.map((p) => (
              <span key={p.name} className="player-chip">
                <span className="num">#{p.number}</span>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {flights.length > 0 && (
        <>
          <div className="section-title">✈️ Flights</div>
          {flights.map((f) => {
            const flyers = flightBookings.filter((b) => b.flight_number === f);
            const time = flightTimeFor(f);
            return (
              <div key={f} className="hotel-group card">
                <div className="hotel-group-header">
                  <span className="hotel-name">{f}</span>
                  {time && <span className="hotel-count">{time}</span>}
                </div>
                <div className="chip-row">{flyers.map(chip)}</div>
              </div>
            );
          })}
        </>
      )}

      {goingByPlayer.size > 0 && (
        <>
          <div className="section-title">👥 Parents going</div>
          <div className="hotel-group card">
            {[...goingByPlayer.entries()].map(([playerName, names]) => {
              const p = ROSTER.find((r) => r.name === playerName);
              return (
                <div key={playerName} className="att-team-row">
                  <span className="player-chip">
                    <span className="num">#{p?.number ?? "–"}</span>
                    {playerName}
                  </span>
                  <span className="att-team-names">{names.join(", ")}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {(driverBookings.length > 0 || orphanRiders.length > 0) && (
        <>
          <div className="section-title">🚗 Driving &amp; carpools</div>
          {driverBookings.map((d) => {
            const riders = ridersFor(d.player_name);
            return (
              <div key={d.id} className="hotel-group card">
                <div className="hotel-group-header">
                  <span className="hotel-name">
                    {familyName(d.player_name)} family car
                  </span>
                  {riders.length > 0 && (
                    <span className="hotel-count">
                      +{riders.length} riding along
                    </span>
                  )}
                </div>
                <div className="chip-row">
                  {chip(d)}
                  {riders.map(chip)}
                </div>
              </div>
            );
          })}
          {orphanRiders.map((b) => (
            <div key={b.id} className="hotel-group card" style={{ borderStyle: "dashed" }}>
              <div className="hotel-group-header">
                <span className="hotel-name">
                  Riding with the {familyName(b.riding_with)} family
                </span>
              </div>
              <div className="chip-row">{chip(b)}</div>
            </div>
          ))}
        </>
      )}

      {/* ---------- private section ---------- */}
      <div className="section-title" style={{ marginTop: 30 }}>
        Your travel plans
      </div>
      <div className="card plans-card">
        <p className="plans-note">
          The team sees who&apos;s going, your hotel, flight number, and
          driving status — confirmation numbers stay private to your family.
        </p>

        {/* Who's going */}
        <div className="plan-row">
          <span className="plan-label">👥 Who&apos;s going from your family?</span>
          <div className="plan-body" style={{ paddingLeft: 0, marginTop: 8 }}>
            {myParents.length === 0 && (
              <span className="no-hotel">No parents registered yet.</span>
            )}
            {myParents.map((par) => {
              const a = attendanceFor(player, par.parent_name);
              const state = a ? (a.going ? "yes" : "no") : "none";
              return (
                <div key={par.id} className="att-row">
                  <span className="att-name">{par.parent_name}</span>
                  <span className="att-buttons">
                    <button
                      className={
                        "att-btn" + (state === "yes" ? " att-yes" : "")
                      }
                      disabled={busy}
                      onClick={() => markAttendance(par.parent_name, true)}
                    >
                      Going
                    </button>
                    <button
                      className={"att-btn" + (state === "no" ? " att-no" : "")}
                      disabled={busy}
                      onClick={() => markAttendance(par.parent_name, false)}
                    >
                      Not going
                    </button>
                  </span>
                </div>
              );
            })}
            {addParentOpen ? (
              <div className="link-form" style={{ marginTop: 8 }}>
                <input
                  placeholder="Parent's first name"
                  value={newParentName}
                  autoFocus
                  onChange={(e) => setNewParentName(e.target.value)}
                />
                <div className="link-form-actions">
                  <button
                    className="btn"
                    disabled={busy}
                    onClick={() => setAddParentOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={busy || !newParentName.trim()}
                    onClick={submitNewParent}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn-ghost"
                onClick={() => setAddParentOpen(true)}
              >
                ＋ Add parent
              </button>
            )}
          </div>
        </div>

        {/* Hotel */}
        <div className="plan-row">
          <label className="plan-toggle">
            <input
              type="checkbox"
              checked={hotelOn}
              disabled={busy}
              onChange={() => {
                setHotelFormOpen(false);
                savePlan(
                  hotelOn
                    ? { no_hotel: true, hotel_name: "", confirmation_number: "" }
                    : { no_hotel: false }
                );
              }}
            />
            <span className="plan-label">🏨 Staying at a hotel</span>
          </label>
          {hotelOn && (
            <div className="plan-body">
              {hotelFormOpen ? (
                <div className="link-form">
                  <input
                    placeholder="Search hotel name"
                    value={hotel}
                    onChange={(e) => {
                      setHotel(e.target.value);
                      setPlacesPicked(false);
                    }}
                    autoFocus
                  />
                  {hotels.filter((h) => {
                    const a = normalize(h);
                    const b = normalize(hotel);
                    return (
                      hotel.trim().length >= 2 &&
                      a !== b &&
                      (a.includes(b) || b.includes(a))
                    );
                  }).length > 0 && (
                    <div className="suggest-row">
                      Same hotel?{" "}
                      {hotels
                        .filter((h) => {
                          const a = normalize(h);
                          const b = normalize(hotel);
                          return a !== b && (a.includes(b) || b.includes(a));
                        })
                        .map((s) => (
                          <button
                            key={s}
                            className="suggest-chip"
                            onClick={() => {
                              setHotel(s);
                              setPlacesPicked(true);
                            }}
                          >
                            {s}
                          </button>
                        ))}
                    </div>
                  )}
                  {placeResults.length > 0 && (
                    <div className="place-results">
                      {placeResults.map((r) => (
                        <button
                          key={r.name + r.address}
                          className="place-result"
                          onClick={() => {
                            setHotel(r.name);
                            setPlacesPicked(true);
                            setPlaceResults([]);
                          }}
                        >
                          <span className="place-name">{r.name}</span>
                          <span className="place-address">{r.address}</span>
                        </button>
                      ))}
                      <div className="place-attribution">
                        Hotel search by Google
                      </div>
                    </div>
                  )}
                  <input
                    placeholder="Confirmation # (optional)"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                  <div className="link-form-actions">
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() => setHotelFormOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={busy || !hotel.trim()}
                      onClick={saveHotel}
                    >
                      {busy ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              ) : myBooking?.hotel_name ? (
                <div className="my-booking">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {myBooking.hotel_name}
                    </div>
                    <div className="event-location" style={{ marginTop: 2 }}>
                      {myBooking.confirmation_number
                        ? `Confirmation #: ${myBooking.confirmation_number}`
                        : "No confirmation number saved"}
                    </div>
                  </div>
                  <button className="btn" onClick={openHotelForm}>
                    Edit
                  </button>
                </div>
              ) : (
                <div className="my-booking">
                  <span className="no-hotel">No hotel booked yet</span>
                  <button
                    className="btn btn-primary add-btn"
                    onClick={openHotelForm}
                  >
                    ＋ Add hotel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Flight */}
        <div className="plan-row">
          <label className="plan-toggle">
            <input
              type="checkbox"
              checked={flightOn}
              disabled={busy}
              onChange={() => {
                setFlightFormOpen(false);
                savePlan({ flying: !flightOn });
              }}
            />
            <span className="plan-label">✈️ Flying</span>
          </label>
          {flightOn && (
            <div className="plan-body">
              {flightFormOpen ? (
                <div className="link-form">
                  <input
                    placeholder="Flight # — e.g. UA1234"
                    value={flightNum}
                    onChange={(e) => setFlightNum(e.target.value)}
                    autoFocus
                  />
                  {flightSuggestions.length > 0 && (
                    <div className="suggest-row">
                      Same flight?{" "}
                      {flightSuggestions.map((f) => (
                        <button
                          key={f}
                          className="suggest-chip"
                          onClick={() => {
                            setFlightNum(f);
                            if (!flightTime.trim())
                              setFlightTime(flightTimeFor(f));
                          }}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    placeholder="Flight time — e.g. Fri 6:05 AM"
                    value={flightTime}
                    onChange={(e) => setFlightTime(e.target.value)}
                  />
                  <input
                    placeholder="Confirmation # (optional, private)"
                    value={flightConf}
                    onChange={(e) => setFlightConf(e.target.value)}
                  />
                  <div className="link-form-actions">
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() => setFlightFormOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={busy || !flightNum.trim()}
                      onClick={saveFlight}
                    >
                      {busy ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              ) : myBooking?.flight_number ? (
                <div className="my-booking">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {myBooking.flight_number}
                      {myBooking.flight_time && (
                        <span className="chip-note">
                          {" "}
                          · {myBooking.flight_time}
                        </span>
                      )}
                    </div>
                    <div className="event-location" style={{ marginTop: 2 }}>
                      {myBooking.flight_conf
                        ? `Confirmation #: ${myBooking.flight_conf}`
                        : "No confirmation number saved"}
                    </div>
                  </div>
                  <button className="btn" onClick={openFlightForm}>
                    Edit
                  </button>
                </div>
              ) : (
                <div className="my-booking">
                  <span className="no-hotel">No flight added yet</span>
                  <button
                    className="btn btn-primary add-btn"
                    onClick={openFlightForm}
                  >
                    ＋ Add flight
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Driving */}
        <div className="plan-row">
          <label className="plan-toggle">
            <input
              type="checkbox"
              checked={drivingOn}
              disabled={busy}
              onChange={() => savePlan({ driving: !drivingOn })}
            />
            <span className="plan-label">🚗 Driving</span>
          </label>
          {drivingOn ? (
            <div className="plan-body">
              <span className="link-meta">
                You&apos;re listed as driving for this trip.
              </span>
            </div>
          ) : (
            <div className="plan-body">
              <label className="link-meta" style={{ display: "block", marginBottom: 4 }}>
                Riding with another family?
              </label>
              <select
                className="btn"
                style={{ cursor: "pointer" }}
                disabled={busy}
                value={myBooking?.riding_with ?? ""}
                onChange={(e) => savePlan({ riding_with: e.target.value })}
              >
                <option value="">—</option>
                {ROSTER.filter((p) => p.name !== player).map((p) => (
                  <option key={p.name} value={p.name}>
                    {familyName(p.name)} family (#{p.number} {p.name})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {saveError && <div className="save-error">{saveError}</div>}
      </div>

      {/* ---------- booking links ---------- */}
      <div className="section-title">
        🔗 Booking links
        {!linkFormOpen && (
          <button
            className="btn-ghost"
            onClick={() => {
              setLinkError(null);
              setLinkFormOpen(true);
            }}
          >
            ＋ Add link
          </button>
        )}
      </div>
      <div className="card" style={{ padding: "14px 16px", marginBottom: 22 }}>
        {linkFormOpen && (
          <div
            className="link-form"
            style={{ marginBottom: tripLinks.length ? 12 : 0 }}
          >
            <input
              placeholder="Paste booking link (https://…)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              autoFocus
            />
            <div className="link-form-actions">
              <button
                className="btn"
                disabled={linkBusy}
                onClick={() => setLinkFormOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={linkBusy || !linkUrl.trim()}
                onClick={submitLink}
              >
                {linkBusy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
        {linkError && <div className="save-error">{linkError}</div>}
        {tripLinks.length === 0 && !linkFormOpen && (
          <span className="no-hotel">
            No booking links yet — share a room block or hotel deal with the
            team.
          </span>
        )}
        {tripLinks.map((l) => (
          <div key={l.id} className="link-row">
            <div>
              <a href={l.url} target="_blank" rel="noreferrer nofollow">
                {l.label} ↗
              </a>
            </div>
            <button
              className="link-remove"
              title="Remove link"
              disabled={linkBusy}
              onClick={() => deleteLink(l.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
