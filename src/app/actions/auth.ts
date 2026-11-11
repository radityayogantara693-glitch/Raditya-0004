"use server";

import { redirect } from "next/navigation";

import type { User } from "@/types";
import { getRepository } from "@/lib/db";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { createSession, destroySession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation";
import { safeNextPath } from "@/lib/utils";

export interface LoginState {
  error?: string;
  email?: string;
}

function isDemoAccount(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.some((account) => account.email === normalized);
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
    // Jangan biarkan kegagalan basis data menjadi error server yang menampilkan
    // halaman "This page couldn't load". Catat detailnya, lalu beri pesan ramah.
    console.error("[auth] gagal membaca user saat login:", error);
    return {
      error: "Layanan akun sedang tidak dapat dihubungi. Coba muat ulang halaman atau hubungi administrator kampus.",
      email: rawEmail,
    };
  }

  if (!user) {
    return {
      error: isDemoAccount(parsed.data.email)
        ? "Akun demo tidak ditemukan. Muat ulang halaman login; bila masih gagal, hapus folder .data agar data demo dibuat ulang."
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
