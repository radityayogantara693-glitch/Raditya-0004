import { NextResponse } from "next/server";

import { getRepository } from "@/lib/db";
import { witaDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Diagnostik lokal.
 * GET /api/health → cek driver basis data dan jumlah data.
 */
export async function GET() {
  try {
    const repo = getRepository();
    const [rooms, bookings, users] = await Promise.all([
      repo.listRooms(),
      repo.listBookings({ limit: 5 }),
      repo.listUsers(),
    ]);

    return NextResponse.json({
      status: "ok",
      driver: repo.driver,
      demoMode: true,
      timezone: "Asia/Makassar (WITA)",
      date: witaDateKey(),
      users: users.length,
      rooms: rooms.length,
      recentBookings: bookings.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Kesalahan tidak dikenal.",
        hint: "Pastikan folder .data dapat ditulis (lokal) atau hapus folder .data agar data demo dibuat ulang.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
