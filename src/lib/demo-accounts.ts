import type { Role } from "@/types";

export const DEMO_ACCOUNTS: Array<{ email: string; label: string; role: Role; hint: string }> = [
  { email: "putu@idb.ac.id", label: "Putu Anindya", role: "MAHASISWA", hint: "Ketua UKM Fotografi" },
  { email: "wayan@idb.ac.id", label: "Wayan Sudarma", role: "DOSEN", hint: "Dosen Desain Interior" },
  { email: "ketut@idb.ac.id", label: "Ketut Ariani", role: "ADMIN", hint: "Admin Sarana Prasarana" },
  { email: "made@idb.ac.id", label: "Made Sujana", role: "SATPAM", hint: "Petugas Gedung" },
];
