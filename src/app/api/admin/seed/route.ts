import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { supabaseConfig } from "@/lib/db";
import { buildSeed } from "@/lib/db/seed";

export const dynamic = "force-dynamic";

function requireSecret(request: NextRequest): { ok: true } | Response {
  const secret = process.env.SEED_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "SEED_SECRET belum diatur di environment Vercel." },
      { status: 500 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7) : "";
  const query = request.nextUrl.searchParams.get("secret") ?? "";

  if (bearer !== secret && query !== secret) {
    return NextResponse.json({ ok: false, error: "Tidak berwenang." }, { status: 401 });
  }

  return { ok: true };
}

/**
 * Menanam/menyegarkan data demo (akun + katalog ruangan) ke Supabase production.
 * Dilindungi SEED_SECRET. Bisa dipicu dari browser (GET) maupun curl (POST):
 *
 *   GET  /api/admin/seed?secret=SEED_SECRET
 *   POST /api/admin/seed?secret=SEED_SECRET
 *   POST /api/admin/seed  (header Authorization: Bearer SEED_SECRET)
 *
 * Hanya menyentuh tabel users dan rooms (idempotent via ON CONFLICT).
 * Pengajuan, tiket, notifikasi, dan audit tetap dibuat lewat alur aplikasi.
 */
async function seedDemoData(request: NextRequest): Promise<Response> {
  const auth = requireSecret(request);
  if (!auth.ok) return auth;

  const { url, key } = supabaseConfig();
  if (!url || !key) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Supabase belum dikonfigurasi. Atur SUPABASE_URL (atau NEXT_PUBLIC_SUPABASE_URL) dan SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const seed = buildSeed();

  // 1. Upsert pengguna demo (kunci: email).
  const users = seed.users.map((u) => ({
    id: u.id,
    sso_id: u.ssoId,
    email: u.email.toLowerCase(),
    full_name: u.fullName,
    role: u.role,
    organization: u.organization ?? null,
    is_active: u.isActive,
    no_show_strikes: u.noShowStrikes,
    suspended_until: u.suspendedUntil ?? null,
    created_at: u.createdAt,
  }));

  const { error: userError } = await supabase.from("users").upsert(users, {
    onConflict: "email",
  });
  if (userError) {
    return NextResponse.json({ ok: false, error: `users: ${userError.message}` }, { status: 500 });
  }

  // 2. Upsert katalog ruangan (kunci: code).
  const rooms = seed.rooms.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    category: r.category,
    building: r.building,
    floor: r.floor,
    capacity: r.capacity,
    facilities: r.facilities,
    description: r.description,
    is_active: r.isActive,
    created_at: r.createdAt,
  }));

  const { error: roomError } = await supabase.from("rooms").upsert(rooms, {
    onConflict: "code",
  });
  if (roomError) {
    return NextResponse.json({ ok: false, error: `rooms: ${roomError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Data demo disimpan ke Supabase production.",
    users: users.length,
    rooms: rooms.length,
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  return seedDemoData(request);
}

export async function GET(request: NextRequest): Promise<Response> {
  return seedDemoData(request);
}
