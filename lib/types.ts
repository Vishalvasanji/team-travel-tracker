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

export interface PlayerParent {
  id: number;
  player_name: string;
  parent_name: string;
  created_at: string;
}

export interface Attendance {
  id: number;
  trip_id: string;
  player_name: string;
  parent_name: string;
  going: number; // 1 = going, 0 = not going; no row = unanswered
  updated_at: string;
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

// One travel-plan row per player per trip. Toggle semantics:
//   hotel: on by default; no_hotel=1 means toggled off
//   flight: off by default; flying=1 means toggled on
//   driving: off by default; driving=1 means on (no extra data needed)
export interface Booking {
  id: number;
  trip_id: string;
  player_name: string;
  hotel_name: string;
  no_hotel: number;
  flying: number;
  driving: number;
  // Team-visible flight info.
  flight_number: string;
  flight_time: string;
  // Player name of the family this player is riding with (carpool).
  riding_with: string;
  // Present only on the requesting family's own row.
  confirmation_number?: string;
  flight_conf?: string;
  created_at: string;
  updated_at: string;
}
