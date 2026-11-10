"use server";

import { redirect } from "next/navigation";

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

  const user = await getRepository().getUserByEmail(parsed.data.email);
  if (!user) {
    return {
      error: "Akun SSO tidak terdaftar. Gunakan salah satu akun demo di bawah untuk mencoba sistem.",
      email: rawEmail,
    };
  }
  if (!user.isActive) {
    return { error: "Akun Anda dinonaktifkan. Hubungi Sarana Prasarana.", email: rawEmail };
  }

  await createSession(user);
  redirect(safeNextPath(String(formData.get("next") ?? ""), "/dashboard"));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
