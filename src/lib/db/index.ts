import { localRepository } from "./local";
import { createSupabaseRepository } from "./supabase";
import type { Repository } from "./repository";

let instance: Repository | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getRepository(): Repository {
  if (instance) return instance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    instance = createSupabaseRepository(url, key);
  } else {
    instance = localRepository;
  }
  return instance;
}

export const isDemoMode = !isSupabaseConfigured();

export type { Repository } from "./repository";
