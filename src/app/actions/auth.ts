"use server";

import { redirect } from "next/navigation";

import type { User } from "@/types";
import { getRepository, supabaseConfig } from "@/lib/db";
import { ensureDemoData, isDemoAccount } from "@/lib/db/demo-bootstrap";
import { createSession, destroySession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation";
import { safeNextPath } from "@/lib/utils";

export interface LoginState {
  error?: string;
  email?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawEmail = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({
    email: rawEmail,
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Isian login tidak valid.",
      email: rawEmail,
    };
  }

  let user: User | null;
  try {
    const repo = getRepository();
    user = await repo.getUserByEmail(parsed.data.email);

    // Self-heal: bila akun demo belum ada di Supabase (mis. seed SQL belum
    // dijalankan), tanam akun demo + katalog ruangan secara idempoten lalu
    // coba lagi. Data yang sudah ada tidak ditimpa.
    if (!user && repo.driver === "supabase" && isDemoAccount(parsed.data.email)) {
      const { url, key } = supabaseConfig();
      if (url && key) {
        try {
          const summary = await ensureDemoData(url, key);
          console.info(
            `[auth] data demo disiapkan otomatis (${summary.users} akun, ${summary.rooms} ruangan).`,
          );
          user = await repo.getUserByEmail(parsed.data.email);
        } catch (seedError) {
          console.error("[auth] gagal menyiapkan data demo otomatis:", seedError);
        }
      }
    }
  } catch (error) {
    // Jangan biarkan kegagalan basis data/konfigurasi menjadi error server yang
    // menampilkan halaman "This page couldn't load". Catat detailnya di log
    // Vercel, lalu kembalikan pesan yang bisa dibaca pengguna.
    console.error("[auth] gagal membaca user saat login:", error);
    const hint = isDemoAccount(parsed.data.email)
      ? " Pastikan skrip supabase/seed-demo-data.sql sudah dijalankan dan environment Supabase (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) benar."
      : "";
    return {
      error: `Layanan akun sedang tidak dapat dihubungi. Coba beberapa saat lagi atau hubungi administrator kampus.${hint}`,
      email: rawEmail,
    };
  }

  if (!user) {
    const demo = isDemoAccount(parsed.data.email);
    return {
      error: demo
        ? "Akun demo belum tersedia di basis data. Pastikan skrip supabase/seed-demo-data.sql sudah dijalankan di Supabase, lalu coba lagi."
        : "Akun SSO tidak terdaftar. Gunakan salah satu akun demo di bawah untuk mencoba sistem.",
      email: rawEmail,
    };
  }
  if (!user.isActive) {
    return { error: "Akun Anda dinonaktifkan. Hubungi Sarana Prasarana.", email: rawEmail };
  }

  try {
    await createSession(user);
  } catch (error) {
    return {
      error: "Gagal membuat sesi login. Silakan coba lagi atau hubungi administrator.",
      email: rawEmail,
    };
  }

  redirect(safeNextPath(String(formData.get("next") ?? ""), "/dashboard"));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
