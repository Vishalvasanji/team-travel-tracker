import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const c = await db();
    const result = await c.execute(
      "SELECT * FROM hotel_bookings ORDER BY created_at ASC"
    );
    return NextResponse.json(result.rows);
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
  const hotel_name = cleanField(body?.hotel_name, 200);
  const notes = cleanField(body?.notes ?? "", 300);
  if (!trip_id || !player_name || !hotel_name || notes === null) {
    return NextResponse.json({ error: "Invalid booking" }, { status: 400 });
  }

  try {
    const c = await db();
    await c.execute({
      sql: `INSERT INTO hotel_bookings (trip_id, player_name, hotel_name, notes)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (trip_id, player_name) DO UPDATE SET
              hotel_name = excluded.hotel_name,
              notes = excluded.notes,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
      args: [trip_id, player_name, hotel_name, notes],
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
