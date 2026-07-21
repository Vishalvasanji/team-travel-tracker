import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const player = req.nextUrl.searchParams.get("player");
  try {
    const c = await db();
    const result = await c.execute(
      "SELECT id, trip_id, player_name, hotel_name, no_hotel, flying, driving, riding_with, flight_number, flight_time, flight_conf, confirmation_number, created_at, updated_at FROM hotel_bookings ORDER BY created_at ASC"
    );
    // Confirmation numbers are family-private: only returned for the
    // requesting device's own player.
    const rows = result.rows.map((r) => {
      const { confirmation_number, flight_conf, ...rest } = r as Record<
        string,
        unknown
      >;
      return r.player_name === player
        ? { ...rest, confirmation_number, flight_conf }
        : rest;
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }
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
  const no_hotel = body?.no_hotel === true;
  const flying = body?.flying === true;
  const driving = body?.driving === true;
  const hotel_name = no_hotel ? "" : cleanField(body?.hotel_name ?? "", 200);
  const confirmation_number = no_hotel
    ? ""
    : cleanField(body?.confirmation_number ?? "", 100);
  const flight_number = cleanField(body?.flight_number ?? "", 20);
  const flight_time = cleanField(body?.flight_time ?? "", 100);
  const flight_conf = cleanField(body?.flight_conf ?? "", 100);
  // Driving yourself and riding with another family are mutually exclusive.
  const riding_with = driving ? "" : cleanField(body?.riding_with ?? "", 100);
  if (
    !trip_id ||
    !player_name ||
    hotel_name === null ||
    confirmation_number === null ||
    flight_number === null ||
    flight_time === null ||
    flight_conf === null ||
    riding_with === null
  ) {
    return NextResponse.json({ error: "Invalid booking" }, { status: 400 });
  }

  try {
    const c = await db();
    await c.execute({
      sql: `INSERT INTO hotel_bookings (trip_id, player_name, hotel_name, confirmation_number, no_hotel, flying, driving, riding_with, flight_number, flight_time, flight_conf)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (trip_id, player_name) DO UPDATE SET
              hotel_name = excluded.hotel_name,
              confirmation_number = excluded.confirmation_number,
              no_hotel = excluded.no_hotel,
              flying = excluded.flying,
              driving = excluded.driving,
              riding_with = excluded.riding_with,
              flight_number = excluded.flight_number,
              flight_time = excluded.flight_time,
              flight_conf = excluded.flight_conf,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
      args: [
        trip_id,
        player_name,
        hotel_name,
        confirmation_number,
        no_hotel ? 1 : 0,
        flying ? 1 : 0,
        driving ? 1 : 0,
        riding_with,
        flight_number,
        flight_time,
        flight_conf,
      ],
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const trip_id = req.nextUrl.searchParams.get("trip_id");
  const player_name = req.nextUrl.searchParams.get("player_name");
  if (!trip_id || !player_name) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }
  try {
    const c = await db();
    await c.execute({
      sql: "DELETE FROM hotel_bookings WHERE trip_id = ? AND player_name = ?",
      args: [trip_id, player_name],
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }
}
