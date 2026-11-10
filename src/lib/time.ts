/**
 * Utilitas waktu. Seluruh sistem memakai WITA (UTC+8) tanpa daylight saving.
 * Database menyimpan instan UTC (ISO string / timestamptz), tampilan & aturan
 * bisnis selalu dihitung dalam WITA.
 */

export const WITA_OFFSET = "+08:00";
export const WITA_TZ = "Asia/Makassar";
export const OPERATING_START_HOUR = 7;
export const OPERATING_END_HOUR = 21;

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: WITA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: WITA_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const longDateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: WITA_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: WITA_TZ,
  day: "numeric",
  month: "short",
});

const weekdayFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: WITA_TZ,
  weekday: "short",
});

/** "2026-10-21" dalam WITA untuk sebuah instan. */
export function witaDateKey(iso: string | Date = new Date()): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return dateKeyFormatter.format(date);
}

export function witaTodayKey(): string {
  return witaDateKey(new Date());
}

export function witaTime(iso: string): string {
  return timeFormatter.format(new Date(iso)).replace(":", ".");
}

export function witaTimeRange(startIso: string, endIso: string): string {
  return `${witaTime(startIso)} – ${witaTime(endIso)}`;
}

export function witaLongDate(value: string | Date): string {
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00${WITA_OFFSET}`)
    : new Date(value);
  return longDateFormatter.format(date);
}

export function witaShortDate(value: string | Date): string {
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00${WITA_OFFSET}`)
    : new Date(value);
  return shortDateFormatter.format(date);
}

export function witaWeekday(value: string | Date): string {
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00${WITA_OFFSET}`)
    : new Date(value);
  return weekdayFormatter.format(date);
}

/** Tanggal + jam WITA → instan UTC. */
export function witaToInstant(dateKey: string, time: string): Date {
  return new Date(`${dateKey}T${time}:00${WITA_OFFSET}`);
}

export function addDaysToKey(dateKey: string, days: number): string {
  const base = new Date(`${dateKey}T12:00:00${WITA_OFFSET}`);
  base.setUTCDate(base.getUTCDate() + days);
  return witaDateKey(base);
}

export function diffDaysFromToday(dateKey: string): number {
  const today = new Date(`${witaTodayKey()}T00:00:00${WITA_OFFSET}`).getTime();
  const target = new Date(`${dateKey}T00:00:00${WITA_OFFSET}`).getTime();
  return Math.round((target - today) / 86_400_000);
}

export function formatMinutesAsDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} menit`;
  if (rest === 0) return `${hours} jam`;
  return `${hours} jam ${rest} menit`;
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

export function witaHour(dateKey: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: WITA_TZ, hour: "2-digit", hour12: false }).format(
      new Date(`${dateKey}T12:00:00${WITA_OFFSET}`),
    ),
  );
}

export function formatDateTimeWita(iso: string | null): string {
  if (!iso) return "—";
  return `${witaShortDate(iso)} ${witaTime(iso)} WITA`;
}

export function formatFullDateTimeWita(iso: string | null): string {
  if (!iso) return "—";
  return `${witaLongDate(iso)} · ${witaTime(iso)} WITA`;
}

export function relativeTimeWita(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  return `${days} hari lalu`;
}

/** 7 hari ke depan mulai hari ini (untuk date strip). */
export function upcomingDateKeys(count = 7, from = witaTodayKey()): string[] {
  return Array.from({ length: count }, (_, index) => addDaysToKey(from, index));
}

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}.00`;
}
