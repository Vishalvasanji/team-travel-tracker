import type { EventType, ScheduleData, TeamEvent, Trip } from "./types";

const ICS_URL =
  process.env.PLAYMETRICS_ICS_URL ||
  "https://calendar.playmetrics.com/calendars/c521/t542960/p0/t6D4FF3EE/f/calendar.ics";

// The team's home base — anything scheduled outside this metro counts as "away".
const HOME_CITY = "Baton Rouge";
const TEAM_PREFIX = /^U14 Elite Girls\s*-\s*/i;

function unescapeIcs(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseCityState(location: string): { city: string; state: string } {
  const parts = location
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && p.toUpperCase() !== "USA");
  if (parts.length < 2) return { city: parts[0] || "", state: "" };
  // Last remaining part is "ST" or "ST 12345"; the one before it is the city.
  const state = parts[parts.length - 1].split(/\s+/)[0];
  const city = parts[parts.length - 2].replace(/\s+\d{5}(-\d{4})?$/, "");
  return { city, state };
}

function classifyType(title: string): EventType {
  if (/practice/i.test(title)) return "practice";
  if (/game/i.test(title)) return "game";
  return "other";
}

// Game descriptions look like "U14 Elite Girls at Coastal Rush (League) | ...".
function parseOpponent(description: string): string {
  const m = description.match(/\b(?:at|vs\.?)\s+([^(|<\n]+?)\s*(?:\(|\||<|$)/i);
  return m ? m[1].trim() : "";
}

export function parseIcsEvents(ics: string): TeamEvent[] {
  const unfolded = ics.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const blocks = unfolded
    .split("BEGIN:VEVENT")
    .slice(1)
    .map((b) => b.split("END:VEVENT")[0]);

  const events: TeamEvent[] = [];
  for (const block of blocks) {
    const prop = (key: string): string => {
      const m = block.match(new RegExp(`^${key}(?:;[^:\\n]*)?:(.*)$`, "m"));
      return m ? unescapeIcs(m[1].trim()) : "";
    };

    const dtstart = prop("DTSTART");
    const dtend = prop("DTEND");
    const startMatch = dtstart.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
    if (!startMatch) continue;
    const [, y, mo, d, hh, mm] = startMatch;
    const endMatch = dtend.match(/^\d{8}T(\d{2})(\d{2})/);

    const rawSummary = prop("SUMMARY");
    const canceled = /^CANCELED/i.test(rawSummary);
    const title =
      rawSummary.replace(/^CANCELED\s*/i, "").replace(TEAM_PREFIX, "").trim() ||
      rawSummary;
    const location = prop("LOCATION");
    const { city, state } = parseCityState(location);
    const type = classifyType(title);
    const description = prop("DESCRIPTION");

    events.push({
      uid: prop("UID"),
      title,
      type,
      canceled,
      away: location !== "" && !location.includes(HOME_CITY),
      allDay: !hh,
      date: `${y}-${mo}-${d}`,
      time: hh ? `${hh}:${mm}` : null,
      endTime: endMatch ? `${endMatch[1]}:${endMatch[2]}` : null,
      location,
      city,
      state,
      opponent: type === "game" ? parseOpponent(description) : "",
      description,
    });
  }

  events.sort((a, b) =>
    (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? ""))
  );
  return events;
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) /
      86400000
  );
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Group away games/tournaments that fall on the same or adjacent days into a
// single "trip" — one hotel stay covers the whole weekend.
export function buildTrips(events: TeamEvent[]): Trip[] {
  const away = events.filter(
    (e) => e.away && !e.canceled && e.type !== "practice"
  );

  // Adjacent days only merge into one trip when they're in the same city —
  // back-to-back games in different towns (e.g. Pensacola then Daphne) are
  // separate trips with separate hotels.
  const groups: TeamEvent[][] = [];
  for (const ev of away) {
    const current = groups[groups.length - 1];
    if (
      current &&
      current[current.length - 1].city === ev.city &&
      daysBetween(current[current.length - 1].date, ev.date) <= 1
    ) {
      current.push(ev);
    } else {
      groups.push([ev]);
    }
  }

  return groups.map((group) => {
    const startDate = group[0].date;
    const endDate = group[group.length - 1].date;
    const titles = [...new Set(group.map((e) => e.title))];
    const places = [...new Set(group.map((e) => `${e.city}, ${e.state}`))];
    const namedTitle = titles.find((t) => !/^game$/i.test(t));
    const opponents = [...new Set(group.map((e) => e.opponent).filter(Boolean))];
    const name =
      namedTitle ??
      (opponents.length
        ? `at ${opponents.join(" & ")}`
        : `Away Game${group.length > 1 ? "s" : ""}`);
    return {
      id: `${startDate}-${slugify(group[0].city || name)}`,
      name,
      startDate,
      endDate,
      place: places.join(" & "),
      multiDay: startDate !== endDate,
      events: group,
    };
  });
}

export async function loadSchedule(): Promise<ScheduleData> {
  const res = await fetch(ICS_URL, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch PlayMetrics calendar (${res.status})`);
  }
  const ics = await res.text();
  const events = parseIcsEvents(ics);
  return {
    events,
    trips: buildTrips(events),
    fetchedAt: new Date().toISOString(),
  };
}
