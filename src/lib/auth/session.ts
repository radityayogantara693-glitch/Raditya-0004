import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { Role, User } from "@/types";
import { getRepository } from "@/lib/db";
import { signPayload, verifySignature } from "@/lib/crypto";

const COOKIE_NAME = "idb_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  userId: string;
  role: Role;
  exp: number;
};

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET wajib diatur di produksi.");
  }
  return secret ?? "dev-only-insecure-session-secret-min-32-characters";
}

export async function createSession(user: User): Promise<void> {
  const payload: SessionPayload = {
    userId: user.id,
    role: user.role,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encoded, sessionSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, `${encoded}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;
  if (!verifySignature(encoded, signature, sessionSecret())) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const payload = await readSession();
  if (!payload) return null;

  const user = await getRepository().getUserById(payload.userId);
  if (!user || !user.isActive) return null;
  return user;
}

export async function requireUser(roles?: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export function isStaff(user: Pick<User, "role">): boolean {
  return user.role === "ADMIN" || user.role === "SATPAM";
}

export function canManageRooms(user: Pick<User, "role">): boolean {
  return user.role === "ADMIN";
}
