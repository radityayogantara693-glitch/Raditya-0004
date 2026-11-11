import { localRepository } from "./local";
import type { Repository } from "./repository";

/**
 * Driver basis data.
 *
 * Proyek ini menggunakan **driver demo lokal** sebagai satu-satunya jalur:
 * data disimpan sebagai JSON di `./.data/db.json` (atau `DATA_DIR`).
 * Integrasi Supabase sudah dilepas.
 */
export function getRepository(): Repository {
  return localRepository;
}

/** Selalu mode demo lokal (tanpa layanan eksternal). */
export const isDemoMode = true;

export type { Repository } from "./repository";
