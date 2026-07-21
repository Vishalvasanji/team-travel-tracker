import { NextRequest, NextResponse } from "next/server";

// Shared team access code gate. When TEAM_ACCESS_CODE is unset the gate is
// disabled entirely (local dev, or before the env var is configured).
const COOKIE = "team-access";

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toUpperCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const code = process.env.TEAM_ACCESS_CODE;
  if (!code) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE)?.value;
  if (cookie && cookie === (await sha256(code))) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Team code required" }, { status: 401 });
  }
  // Redirect to the code page, preserving the originally requested page so
  // deep links (e.g. a shared trip hub) survive the gate.
  const url = req.nextUrl.clone();
  const next = url.pathname + url.search;
  url.pathname = "/enter";
  url.search = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!enter|api/auth|_next/|manifest\\.webmanifest|robots\\.txt|icon\\.svg|icon-512\\.png|apple-touch-icon\\.png|opengraph-image|favicon).*)",
  ],
};
