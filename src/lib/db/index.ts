import { localRepository } from "./local";
import { createSupabaseRepository } from "./supabase";
import type { Repository } from "./repository";

let instance: Repository | null = null;

/**
 * Membaca environment variable secara dinamis (bracket access).
 *
 * Next.js mengganti `process.env.NEXT_PUBLIC_*` secara statis saat build,
 * sehingga nilai yang ditambahkan ke Vercel SETELAH build bisa tetap terbaca
 * `undefined`. Dengan bracket access nilainya dibaca saat runtime.
 */
function env(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/** Deteksi lingkungan Vercel (production/preview) — filesystem read-only. */
export function isOnVercel(): boolean {
  return Boolean(process.env.VERCEL) || process.env.VERCEL_ENV != null;
}

/**
 * Konfigurasi Supabase.
 *
 * `SUPABASE_URL` adalah nama yang disarankan untuk server karena dibaca saat
 * runtime. `NEXT_PUBLIC_SUPABASE_URL` tetap didukung untuk kompatibilitas.
 * Untuk key, gunakan SERVICE ROLE (bukan anon) agar bisa menulis data.
 */
export function supabaseConfig(): { url?: string; key?: string } {
  return {
    url: env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL"),
    key: env("SUPABASE_SERVICE_ROLE_KEY") ?? env("SUPABASE_SERVICE_KEY"),
  };
}

/** Supabase siap digunakan (produksi). */
export function isSupabaseConfigured(): boolean {
  const { url, key } = supabaseConfig();
  return Boolean(url && key);
}

/**
 * Pilih driver basis data.
 *
 * Aturan agar aman di Vercel (filesystem read-only):
 * 1. Jika Supabase terkonfigurasi → selalu pakai Supabase, jangan sentuh .data.
 * 2. Jika di Vercel tapi Supabase belum diatur → lempar error konfigurasi yang
 *    jelas, jangan fallback ke lokal (akan gagal ENOENT mkdir /var/task/.data).
 * 3. Di development (bukan Vercel) dan Supabase belum ada → pakai lokal (.data).
 */
export function getRepository(): Repository {
  if (instance) return instance;

  const { url, key } = supabaseConfig();
  if (url && key) {
    instance = createSupabaseRepository(url, key);
    return instance;
  }

  if (isOnVercel()) {
    const missing = [!url && "SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL", !key && "SUPABASE_SERVICE_ROLE_KEY"]
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `Supabase belum dikonfigurasi di Vercel (${missing}). ` +
        "Driver lokal (.data/db.json) tidak dapat digunakan pada filesystem read-only Vercel.",
    );
  }

  instance = localRepository;
  return instance;
}

/** Mode demo: lokal tanpa Supabase. Di Vercel dengan Supabase, ini false. */
export const isDemoMode = !isSupabaseConfigured() && !isOnVercel();

export type { Repository } from "./repository";
