import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const c = await db();
    const result = await c.execute(
      "SELECT * FROM trip_attendance ORDER BY updated_at ASC"
    );
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }
}

function cleanField(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v && v.length <= maxLen ? v : null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const trip_id = cleanField(body?.trip_id, 100);
  const player_name = cleanField(body?.player_name, 100);
  const parent_name = cleanField(body?.parent_name, 50);
  const going = body?.going === true;
  if (!trip_id || !player_name || !parent_name) {
    return NextResponse.json({ error: "Invalid attendance" }, { status: 400 });
  }

  try {
    const c = await db();
    await c.execute({
      sql: `INSERT INTO trip_attendance (trip_id, player_name, parent_name, going)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (trip_id, player_name, parent_name) DO UPDATE SET
              going = excluded.going,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
      args: [trip_id, player_name, parent_name, going ? 1 : 0],
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const trip_id = p.get("trip_id");
  const player_name = p.get("player_name");
  const parent_name = p.get("parent_name");
  if (!trip_id || !player_name || !parent_name) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }
  try {
    const c = await db();
    await c.execute({
      sql: "DELETE FROM trip_attendance WHERE trip_id = ? AND player_name = ? AND parent_name = ?",
      args: [trip_id, player_name, parent_name],
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }
}
