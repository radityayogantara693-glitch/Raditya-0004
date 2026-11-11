import type { Role } from "@/types";

/**
 * Akun demo statis yang ditampilkan di halaman login.
 * Harus selaras dengan `buildSeed()` (src/lib/db/seed.ts) agar tombol klik
 * langsung mengisi email yang benar-benar terdaftar di Supabase.
 */
export const DEMO_ACCOUNTS: Array<{ email: string; label: string; role: Role; hint: string }> = [
  { email: "putu@idb.ac.id", label: "Putu Anindya", role: "MAHASISWA", hint: "Ketua UKM Fotografi" },
  { email: "ayu@idb.ac.id", label: "Ayu Lestari", role: "MAHASISWA", hint: "Anggota UKM Musik" },
  { email: "wayan@idb.ac.id", label: "Wayan Sudarma", role: "DOSEN", hint: "Dosen Desain Interior" },
  { email: "ketut@idb.ac.id", label: "Ketut Ariani", role: "ADMIN", hint: "Admin Sarana Prasarana" },
  { email: "made@idb.ac.id", label: "Made Sujana", role: "SATPAM", hint: "Petugas Gedung" },
];
