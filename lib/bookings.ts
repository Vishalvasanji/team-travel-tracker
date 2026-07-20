import type { Booking } from "./types";

export async function fetchBookings(): Promise<Booking[]> {
  const res = await fetch("/api/bookings", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load hotel bookings");
  return res.json();
}

export async function saveBooking(input: {
  trip_id: string;
  player_name: string;
  hotel_name: string;
  notes: string;
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
