export type EventType = "game" | "practice" | "other";

export interface TeamEvent {
  uid: string;
  title: string;
  type: EventType;
  canceled: boolean;
  away: boolean;
  allDay: boolean;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM (24h)
  endTime: string | null;
  location: string;
  city: string;
  state: string;
  opponent: string;
  description: string;
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  place: string; // e.g. "Birmingham, AL" or "Pensacola, FL & Daphne, AL"
  multiDay: boolean;
  events: TeamEvent[];
}

export interface ScheduleData {
  events: TeamEvent[];
  trips: Trip[];
  fetchedAt: string;
}

export interface TripVenue {
  trip_id: string;
  venue: string;
  added_by: string;
  updated_at: string;
}

export interface TripLink {
  id: number;
  trip_id: string;
  label: string;
  url: string;
  added_by: string;
  created_at: string;
}

export interface Booking {
  id: number;
  trip_id: string;
  player_name: string;
  hotel_name: string;
  // Present only on the requesting family's own bookings.
  confirmation_number?: string;
  created_at: string;
  updated_at: string;
}
