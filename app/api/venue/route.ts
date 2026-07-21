import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const c = await db();
    const result = await c.execute("SELECT * FROM trip_venues");
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
  const venue = cleanField(body?.venue, 250);
  const added_by = cleanField(body?.added_by ?? "", 100);
  if (!trip_id || !venue || added_by === null) {
    return NextResponse.json({ error: "Invalid venue" }, { status: 400 });
  }

  try {
    const c = await db();
    await c.execute({
      sql: `INSERT INTO trip_venues (trip_id, venue, added_by)
            VALUES (?, ?, ?)
            ON CONFLICT (trip_id) DO UPDATE SET
              venue = excluded.venue,
              added_by = excluded.added_by,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
      args: [trip_id, venue, added_by],
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }
}
