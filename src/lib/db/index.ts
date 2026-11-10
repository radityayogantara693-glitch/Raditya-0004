import { localRepository } from "./local";
import { createSupabaseRepository } from "./supabase";
import type { Repository } from "./repository";

let instance: Repository | null = null;

/** Deteksi lingkungan Vercel (production/preview) — filesystem read-only. */
export function isOnVercel(): boolean {
  return process.env.VERCEL === "1";
}

/** Supabase siap digunakan (produksi). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Pilih driver basis data.
 *
 * Aturan agar aman di Vercel (filesystem read-only):
 * 1. Jika Supabase terkonfigurasi → selalu pakai Supabase, jangan sentuh .data.
 * 2. Jika di Vercel tapi Supaba
ch belum diatur → lempar error konfigurasi yang jelas,
 *    jangan fallback ke lokal (akan gagal ENOENT mkdir /var/task/.data).
 * 3. Di development (bukan Vercel) dan Supabase belum ada → pakai lokal (.data).
 */
export function getRepository(): Repository {
  if (instance) return instance;

  if (isSupabaseConfigured()) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    instance = createSupabaseRepository(url, key);
    return instance;
  }

  if (isOnVercel()) {
    throw new Error(
      "Supabase belum dikonfigurasi di Vercel (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). " +
        "Driver lokal (.data/db.json) tidak dapat digunakan pada filesystem read-only Vercel.",
    );
  }

  instance = localRepository;
  return instance;
}

/** Mode demo: lokal tanpa Supabase. Di Vercel dengan Supabase, ini false. */
export const isDemoMode = !isSupabaseConfigured() && !isOnVercel();

export type { Repository } from "./repository";
