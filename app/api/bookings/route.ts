import { NextRequest, NextResponse } from "next/server";

// The anon key is a publishable key; row access is governed by RLS. Keeping it
// server-side anyway means parents' browsers only ever talk to this site.
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://snicwfhtgxmbfrhbwrid.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuaWN3Zmh0Z3htYmZyaGJ3cmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NzY1OTYsImV4cCI6MjEwMDE1MjU5Nn0.-Ji4VhgFtbm6bY9ZWf72Ugj7alqeUWNCutY3UBWYfig";

const REST = `${SUPABASE_URL}/rest/v1/hotel_bookings`;

const headers: Record<string, string> = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

export const dynamic = "force-dynamic";

export async function GET() {
  const res = await fetch(`${REST}?select=*&order=created_at.asc`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }
  return NextResponse.json(await res.json());
}

function cleanField(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length > maxLen ? null : v;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const trip_id = cleanField(body?.trip_id, 100);
  const player_name = cleanField(body?.player_name, 100);
  const hotel_name = cleanField(body?.hotel_name, 200);
  const notes = cleanField(body?.notes ?? "", 300);
  if (!trip_id || !player_name || !hotel_name || notes === null) {
    return NextResponse.json({ error: "Invalid booking" }, { status: 400 });
  }

  const res = await fetch(`${REST}?on_conflict=trip_id,player_name`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      trip_id,
      player_name,
      hotel_name,
      notes,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const trip_id = req.nextUrl.searchParams.get("trip_id");
  const player_name = req.nextUrl.searchParams.get("player_name");
  if (!trip_id || !player_name) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }
  const params = new URLSearchParams({
    trip_id: `eq.${trip_id}`,
    player_name: `eq.${player_name}`,
  });
  const res = await fetch(`${REST}?${params}`, { method: "DELETE", headers });
  if (!res.ok) {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
