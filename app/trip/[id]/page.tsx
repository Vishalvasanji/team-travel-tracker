"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Booking, ScheduleData, TripLink, TripVenue } from "@/lib/types";
import { ROSTER } from "@/lib/roster";
import { usePlayer } from "@/lib/player";
import {
  addLink,
  fetchBookings,
  fetchLinks,
  fetchVenues,
  removeBooking,
  removeLink,
  saveBooking,
  saveVenue,
} from "@/lib/bookings";
import { formatRange, mapsUrl } from "@/lib/format";

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function TripHubPage() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;
  const player = usePlayer();

  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [hotel, setHotel] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [placeResults, setPlaceResults] = useState<
    { name: string; address: string }[]
  >([]);
  const [placesPicked, setPlacesPicked] = useState(false);

  const [links, setLinks] = useState<TripLink[]>([]);
  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [venues, setVenues] = useState<TripVenue[]>([]);
  const [venueFormOpen, setVenueFormOpen] = useState(false);
  const [venueInput, setVenueInput] = useState("");
  const [venueBusy, setVenueBusy] = useState(false);
  const [venueError, setVenueError] = useState<string | null>(null);

  const refreshBookings = () =>
    fetchBookings(player)
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
    fetchLinks()
      .then(setLinks)
      .catch(() => {});
    fetchVenues()
      .then(setVenues)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  const trip = schedule?.trips.find((t) => t.id === tripId);
  const tripPlace = trip?.place ?? "";

  // Google Places hotel search near the trip's city, debounced while typing.
  // Silently inactive when no API key is configured server-side.
  useEffect(() => {
    if (!formOpen || placesPicked || hotel.trim().length < 3) {
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
  }, [hotel, formOpen, placesPicked, tripPlace]);

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
  const hotels = [...new Set(tripBookings.map((b) => b.hotel_name))];
  const unbooked = ROSTER.filter(
    (p) => !tripBookings.some((b) => b.player_name === p.name)
  );

  // Fuzzy match the typed name against hotels other families already booked
  // so spellings converge and the by-hotel grouping stays clean.
  const suggestions =
    hotel.trim().length >= 2
      ? hotels.filter((h) => {
          const a = normalize(h);
          const b = normalize(hotel);
          return a !== b && (a.includes(b) || b.includes(a));
        })
      : [];

  const openForm = () => {
    setHotel(myBooking?.hotel_name ?? "");
    setConfirmation(myBooking?.confirmation_number ?? "");
    setSaveError(null);
    setPlacesPicked(Boolean(myBooking));
    setFormOpen(true);
  };

  const save = async () => {
    if (!hotel.trim()) return;
    setBusy(true);
    setSaveError(null);
    // Snap to an existing hotel's spelling when the names are equivalent.
    const typed = hotel.trim();
    const existing = hotels.find((h) => normalize(h) === normalize(typed));
    try {
      await saveBooking({
        trip_id: trip.id,
        player_name: player,
        hotel_name: existing ?? typed,
        confirmation_number: confirmation.trim(),
      });
      await refreshBookings();
      setFormOpen(false);
    } catch {
      setSaveError("Save failed — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setSaveError(null);
    try {
      await removeBooking(trip.id, player);
      await refreshBookings();
      setFormOpen(false);
    } catch {
      setSaveError("Could not remove the booking — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const tripLinks = links.filter((l) => l.trip_id === trip.id);
  const tripVenue = venues.find((v) => v.trip_id === trip.id);

  // A feed location like "Birmingham, AL, USA" is just a city — no actual
  // field. Street addresses / named venues have more parts.
  const isVagueLocation = (location: string) =>
    location
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p && p.toUpperCase() !== "USA").length <= 2;

  const feedLocations = [...new Set(trip.events.map((e) => e.location))].filter(
    (l) => !tripVenue || !isVagueLocation(l)
  );
  const hasVagueFeed = trip.events.some((e) => isVagueLocation(e.location));

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

  const submitLink = async () => {
    if (!linkUrl.trim()) return;
    setLinkBusy(true);
    setLinkError(null);
    const url = /^https?:\/\//i.test(linkUrl.trim())
      ? linkUrl.trim()
      : `https://${linkUrl.trim()}`;
    // Label the link by its site name, e.g. "hilton.com".
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
              <span className="link-meta">
                {" "}
                ·{" "}
                {tripVenue.added_by
                  ? `updated by ${tripVenue.added_by.split(" ")[0]}'s family`
                  : "usual venue from past years"}
              </span>{" "}
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

      <div className="section-title">Your booking</div>
      <div className="card" style={{ padding: "16px 18px", marginBottom: 22 }}>
        {formOpen ? (
          <>
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
              {suggestions.length > 0 && (
                <div className="suggest-row">
                  Same hotel?{" "}
                  {suggestions.map((s) => (
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
                  onClick={() => setFormOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={busy || !hotel.trim()}
                  onClick={save}
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
            {saveError && <div className="save-error">{saveError}</div>}
          </>
        ) : myBooking ? (
          <div className="my-booking">
            <div>
              <div style={{ fontWeight: 700, fontSize: 15.5 }}>
                🏨 {myBooking.hotel_name}
              </div>
              <div className="event-location" style={{ marginTop: 3 }}>
                {myBooking.confirmation_number
                  ? `Confirmation #: ${myBooking.confirmation_number}`
                  : "No confirmation number saved"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={openForm}>
                Edit
              </button>
              <button className="btn-ghost" disabled={busy} onClick={remove}>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="my-booking">
            <span className="no-hotel">No hotel booked</span>
            <button className="btn btn-primary add-btn" onClick={openForm}>
              ＋ Add hotel
            </button>
          </div>
        )}
      </div>

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
              {l.added_by && (
                <span className="link-meta">
                  {" "}
                  · added by {l.added_by.split(" ")[0]}&apos;s family
                </span>
              )}
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
