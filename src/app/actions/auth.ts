"use server";

import { redirect } from "next/navigation";

import type { User } from "@/types";
import { getRepository } from "@/lib/db";
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
    user = await getRepository().getUserByEmail(parsed.data.email);
  } catch (error) {
    // Jangan biarkan kegagalan basis data/konfigurasi menjadi error server yang
    // menampilkan halaman "This page couldn't load". Catat detailnya di log
    // Vercel, lalu kembalikan pesan yang bisa dibaca pengguna.
    console.error("[auth] gagal membaca user saat login:", error);
    return {
      error:
        "Layanan akun sedang tidak dapat dihubungi. Coba beberapa saat lagi atau hubungi administrator kampus.",
      email: rawEmail,
    };
  }

  if (!user) {
    return {
      error: "Akun SSO tidak terdaftar. Gunakan salah satu akun demo di bawah untuk mencoba sistem.",
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
