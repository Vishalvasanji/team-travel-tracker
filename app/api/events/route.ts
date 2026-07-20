import { NextResponse } from "next/server";
import { loadSchedule } from "@/lib/schedule";

export const revalidate = 3600;

export async function GET() {
  try {
    const data = await loadSchedule();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load schedule" },
      { status: 502 }
    );
  }
}
