import { NextResponse } from "next/server";

import { getRepository, isDemoMode, isOnVercel, isSupabaseConfigured } from "@/lib/db";
import { witaDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Diagnostik deployment.
 * GET /api/health → cek driver basis data, jumlah data, dan status konfigurasi.
 * Jangan pernah mengembalikan nilai secret (hanya boolean/status).
 */
export async function GET() {
  const diagnostics = {
    supabaseConfigured: isSupabaseConfigured(),
    onVercel: isOnVercel(),
  };

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
      demoMode: isDemoMode,
      ...diagnostics,
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
        ...diagnostics,
        message: error instanceof Error ? error.message : "Kesalahan tidak dikenal.",
        hint: !diagnostics.supabaseConfigured
          ? "Atur SUPABASE_URL (atau NEXT_PUBLIC_SUPABASE_URL) dan SUPABASE_SERVICE_ROLE_KEY di environment Production Vercel, lalu redeploy."
          : "Supabase terdeteksi tetapi kueri gagal. Periksa tabel users/rooms/bookings, RLS, dan gunakan service role key.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
