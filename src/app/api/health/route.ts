import { NextResponse } from "next/server";

import { getRepository, isDemoMode } from "@/lib/db";
import { witaDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const repo = getRepository();
    const [rooms, bookings] = await Promise.all([repo.listRooms(), repo.listBookings({ limit: 5 })]);

    return NextResponse.json({
      status: "ok",
      driver: repo.driver,
      demoMode: isDemoMode,
      timezone: "Asia/Makassar (WITA)",
      date: witaDateKey(),
      rooms: rooms.length,
      recentBookings: bookings.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Kesalahan tidak dikenal.",
      },
      { status: 500 },
    );
  }
}
