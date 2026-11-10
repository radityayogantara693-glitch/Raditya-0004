import { NextResponse, type NextRequest } from "next/server";

import { runMaintenance } from "@/lib/services/bookings";

export const dynamic = "force-dynamic";

/**
 * US-03: pelepasan slot no-show & penutupan sesi.
 * Dijadwalkan setiap hari pukul 00:00 UTC (lihat README) dengan header:
 *   Authorization: Bearer <CRON_SECRET>
 * juga menerima ?secret=<CRON_SECRET> untuk pengujian manual.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET belum dikonfigurasi." }, { status: 500 });
  }

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7) : "";
  const query = request.nextUrl.searchParams.get("secret") ?? "";

  if (bearer !== secret && query !== secret) {
    return NextResponse.json({ ok: false, error: "Tidak berwenang." }, { status: 401 });
  }

  try {
    const result = await runMaintenance();
    return NextResponse.json({
      ok: true,
      releasedNoShow: result.released,
      completed: result.completed,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Gagal menjalankan pembersihan." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
