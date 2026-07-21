import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const c = await db();
    const result = await c.execute(
      "SELECT * FROM trip_links ORDER BY created_at ASC"
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
  const label = cleanField(body?.label, 120);
  const url = cleanField(body?.url, 500);
  const added_by = cleanField(body?.added_by ?? "", 100);
  if (!trip_id || !label || !url || added_by === null) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }
  if (!/^https?:\/\/.+\..+/.test(url)) {
    return NextResponse.json(
      { error: "Link must start with http:// or https://" },
      { status: 400 }
    );
  }

  try {
    const c = await db();
    await c.execute({
      sql: "INSERT INTO trip_links (trip_id, label, url, added_by) VALUES (?, ?, ?, ?)",
      args: [trip_id, label, url, added_by],
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  try {
    const c = await db();
    await c.execute({
      sql: "DELETE FROM trip_links WHERE id = ?",
      args: [Number(id)],
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }
}
