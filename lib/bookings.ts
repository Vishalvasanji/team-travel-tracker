import type { Booking, TripLink, TripVenue } from "./types";

export async function fetchVenues(): Promise<TripVenue[]> {
  const res = await fetch("/api/venue", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load venues");
  return res.json();
}

export async function saveVenue(input: {
  trip_id: string;
  venue: string;
  added_by: string;
}): Promise<void> {
  const res = await fetch("/api/venue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Could not save the venue");
}

export async function fetchLinks(): Promise<TripLink[]> {
  const res = await fetch("/api/links", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load booking links");
  return res.json();
}

export async function addLink(input: {
  trip_id: string;
  label: string;
  url: string;
  added_by: string;
}): Promise<void> {
  const res = await fetch("/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Could not save the link");
}

export async function removeLink(id: number): Promise<void> {
  const res = await fetch(`/api/links?id=${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not remove the link");
}

// Pass the device's player to receive that player's confirmation number;
// everyone else's stays server-side.
export async function fetchBookings(player?: string): Promise<Booking[]> {
  const qs = player ? `?player=${encodeURIComponent(player)}` : "";
  const res = await fetch(`/api/bookings${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load hotel bookings");
  return res.json();
}

export async function saveBooking(input: {
  trip_id: string;
  player_name: string;
  hotel_name?: string;
  confirmation_number?: string;
  no_hotel?: boolean;
}): Promise<void> {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Could not save the hotel booking");
}

export async function removeBooking(
  trip_id: string,
  player_name: string
): Promise<void> {
  const params = new URLSearchParams({ trip_id, player_name });
  const res = await fetch(`/api/bookings?${params}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not remove the hotel booking");
}
