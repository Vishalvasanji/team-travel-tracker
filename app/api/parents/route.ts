import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const c = await db();
    const result = await c.execute(
      "SELECT * FROM player_parents ORDER BY created_at ASC"
    );
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const player_name =
    typeof body?.player_name === "string" ? body.player_name.trim() : "";
  const parent_name =
    typeof body?.parent_name === "string" ? body.parent_name.trim() : "";
  if (
    !player_name ||
    !parent_name ||
    player_name.length > 100 ||
    parent_name.length > 50
  ) {
    return NextResponse.json({ error: "Invalid parent" }, { status: 400 });
  }

  try {
    const c = await db();
    // Case-insensitive dedupe: "vishal" and "Vishal" are the same parent.
    const existing = await c.execute({
      sql: "SELECT id FROM player_parents WHERE player_name = ? AND lower(parent_name) = lower(?)",
      args: [player_name, parent_name],
    });
    if (existing.rows.length === 0) {
      await c.execute({
        sql: "INSERT INTO player_parents (player_name, parent_name) VALUES (?, ?)",
        args: [player_name, parent_name],
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }
}
