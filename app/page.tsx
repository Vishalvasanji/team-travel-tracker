"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ScheduleData, TeamEvent } from "@/lib/types";
import {
  formatDate,
  formatRange,
  formatTime,
  mapsUrl,
  monthName,
  toDate,
  todayYmd,
} from "@/lib/format";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<{ y: number; m: number } | null>(null);
  const [showPractices, setShowPractices] = useState(false);

  useEffect(() => {
    fetch("/api/events")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load the team schedule.");
        return r.json();
      })
      .then((d: ScheduleData) => {
        setData(d);
        const today = todayYmd();
        const next =
          d.events.find((e) => e.date >= today && !e.canceled) ?? d.events[0];
        const base = next ? toDate(next.date) : new Date();
        setMonth({ y: base.getFullYear(), m: base.getMonth() });
      })
      .catch((e) => setError(e.message));
  }, []);

  const visible = useMemo(() => {
    if (!data) return [];
    return data.events.filter(
      (e) => !e.canceled && (showPractices || e.type !== "practice")
    );
  }, [data, showPractices]);

  const byDate = useMemo(() => {
    const map = new Map<string, TeamEvent[]>();
    for (const e of visible) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [visible]);

  if (error) return <div className="error-box card">{error}</div>;
  if (!data || !month) return <div className="loading">Loading schedule…</div>;

  const today = todayYmd();
  const upcomingTrips = data.trips.filter((t) => t.endDate >= today);

  const first = new Date(month.y, month.m, 1);
  const cells: { ymd: string; day: number; outside: boolean }[] = [];
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    cells.push({ ymd, day: d.getDate(), outside: d.getMonth() !== month.m });
  }

  const monthPrefix = `${month.y}-${String(month.m + 1).padStart(2, "0")}`;
  const monthEvents = visible.filter((e) => e.date.startsWith(monthPrefix));

  const shift = (delta: number) => {
    const d = new Date(month.y, month.m + delta, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <>
      <h1>Team Calendar</h1>
      <p className="page-sub">
        Live from the PlayMetrics schedule. Away games and tournaments are
        highlighted — tap a trip to set up hotels.
      </p>

      {upcomingTrips.length > 0 && (
        <>
          <div className="section-title">✈️ Upcoming Away Trips</div>
          <div className="trip-strip">
            {upcomingTrips.map((t) => (
              <Link
                key={t.id}
                href={`/hotels?trip=${t.id}`}
                className="trip-card card"
              >
                <div className="trip-card-name">{t.name}</div>
                <div className="trip-card-place">{t.place}</div>
                <div className="trip-card-dates">
                  {formatRange(t.startDate, t.endDate)}
                </div>
                <div className="trip-card-meta">
                  {t.multiDay ? (
                    <span className="badge badge-tournament">Multi-day</span>
                  ) : (
                    <span className="badge badge-away">Away game</span>
                  )}{" "}
                  · Hotel planning →
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="cal-toolbar">
        <div className="cal-month">
          {monthName(month.m)} {month.y}
        </div>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showPractices}
            onChange={(e) => setShowPractices(e.target.checked)}
          />
          Show practices
        </label>
        <div className="cal-nav-buttons">
          <button className="btn" onClick={() => shift(-1)}>
            ← Prev
          </button>
          <button
            className="btn"
            onClick={() => {
              const now = new Date();
              setMonth({ y: now.getFullYear(), m: now.getMonth() });
            }}
          >
            Today
          </button>
          <button className="btn" onClick={() => shift(1)}>
            Next →
          </button>
        </div>
      </div>

      <div className="cal-grid">
        {DOW.map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {cells.map((c) => (
          <div
            key={c.ymd}
            className={
              "cal-cell" +
              (c.outside ? " outside" : "") +
              (c.ymd === today ? " today" : "")
            }
          >
            <div className="cal-daynum">{c.day}</div>
            {(byDate.get(c.ymd) ?? []).map((e) => (
              <span
                key={e.uid + e.date}
                className={
                  `cal-pill ${e.type}` + (e.away ? " away-pill" : "")
                }
                title={`${e.title} — ${e.location}`}
              >
                {e.away ? "✈ " : ""}
                {e.time ? formatTime(e.time).replace(":00", "") + " " : ""}
                {e.title}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="section-title">
        Events in {monthName(month.m)} {month.y}
      </div>
      {monthEvents.length === 0 ? (
        <div className="card loading">
          No {showPractices ? "" : "games or "}events this month.
        </div>
      ) : (
        <div className="event-list">
          {monthEvents.map((e) => (
            <div key={e.uid + e.date} className="event-row card">
              <div className="event-date-block">
                {formatDate(e.date)}
                <div className="event-time">{formatTime(e.time)}</div>
              </div>
              <div>
                <div className="event-title">
                  {e.title}
                  {e.away && <span className="badge badge-away">Away</span>}
                </div>
                <div className="event-location">
                  📍{" "}
                  <a href={mapsUrl(e.location)} target="_blank" rel="noreferrer">
                    {e.location}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
