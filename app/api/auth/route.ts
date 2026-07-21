import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expected = process.env.TEAM_ACCESS_CODE;
  if (!expected) return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code || code.toUpperCase() !== expected.trim().toUpperCase()) {
    return NextResponse.json({ error: "Wrong code" }, { status: 401 });
  }

  const hash = createHash("sha256")
    .update(expected.trim().toUpperCase())
    .digest("hex");
  const res = NextResponse.json({ ok: true });
  res.cookies.set("team-access", hash, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
