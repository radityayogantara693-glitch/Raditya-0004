import { randomBytes, randomUUID, createHmac, timingSafeEqual } from "node:crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function randomId(): string {
  return randomUUID();
}

export function ticketCode(): string {
  const chars = Array.from({ length: 8 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]);
  return `IDB-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = signPayload(payload, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
