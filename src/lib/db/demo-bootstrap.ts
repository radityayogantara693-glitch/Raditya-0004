import "server-only";

import { createClient } from "@supabase/supabase-js";

import { buildSeed } from "./seed";

/**
 * Daftar email akun demo. Harus selaras dengan `buildSeed()` dan
 * `DEMO_ACCOUNTS` pada `src/lib/demo-accounts.ts`.
 */
const DEMO_EMAILS = new Set([
  "putu@idb.ac.id",
  "ayu@idb.ac.id",
  "wayan@idb.ac.id",
  "ketut@idb.ac.id",
  "made@idb.ac.id",
]);

export function isDemoAccount(email: string): boolean {
  return DEMO_EMAILS.has(email.trim().toLowerCase());
}

export interface DemoSeedSummary {
  users: number;
  rooms: number;
}

/**
 * Menanam akun demo + katalog ruangan ke Supabase secara idempoten.
 *
 * - `ignoreDuplicates: true` → baris yang sudah ada TIDAK diubah, sehingga
 *   perubahan/penyesuaian data oleh admin tidak tertimpa.
 * - Hanya menyisipkan data master (users, rooms). Pengajuan, tiket, dan
 *   check-in tetap dibuat lewat alur normal aplikasi.
 *
 * Dipakai oleh:
 *   1. `POST/GET /api/admin/seed` (seed manual), dan
 *   2. `loginAction` (self-heal bila akun demo belum ada di Supabase).
 */
export async function ensureDemoData(url: string, key: string): Promise<DemoSeedSummary> {
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const seed = buildSeed();

  const users = seed.users.map((user) => ({
    id: user.id,
    sso_id: user.ssoId,
    email: user.email.toLowerCase(),
    full_name: user.fullName,
    role: user.role,
    organization: user.organization ?? null,
    is_active: user.isActive,
    no_show_strikes: user.noShowStrikes,
    suspended_until: user.suspendedUntil ?? null,
    created_at: user.createdAt,
  }));

  const { error: userError } = await supabase.from("users").upsert(users, {
    onConflict: "email",
    ignoreDuplicates: true,
  });
  if (userError) {
    throw new Error(`Gagal menyiapkan akun demo pada tabel users: ${userError.message}`);
  }

  const rooms = seed.rooms.map((room) => ({
    id: room.id,
    code: room.code,
    name: room.name,
    category: room.category,
    building: room.building,
    floor: room.floor,
    capacity: room.capacity,
    facilities: room.facilities,
    description: room.description,
    is_active: room.isActive,
    created_at: room.createdAt,
  }));

  const { error: roomError } = await supabase.from("rooms").upsert(rooms, {
    onConflict: "code",
    ignoreDuplicates: true,
  });
  if (roomError) {
    throw new Error(`Gagal menyiapkan katalog ruangan pada tabel rooms: ${roomError.message}`);
  }

  return { users: users.length, rooms: rooms.length };
}
