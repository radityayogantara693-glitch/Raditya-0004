import type { Booking, BookingStatus, Role, RoomCategory } from "@/types";
import { BLOCKING_STATUSES } from "@/types";
import { OPERATING_END_HOUR, OPERATING_START_HOUR, diffDaysFromToday } from "@/lib/time";

/**
 * Aturan bisnis terpusat. Semua nilai yang dapat berubah ada di sini agar
 * mudah diaudit dan disesuaikan lewat kebijakan Sarpras.
 */
export const RULES = {
  /** BK-05: pemohon mahasiswa/UKM wajib mengajukan minimal H-2. */
  minAdvanceDays: { MAHASISWA: 2, DOSEN: 0, ADMIN: 0, SATPAM: 0 } as Record<Role, number>,
  /** BK-05: horizon pengajuan maksimal. */
  maxHorizonDays: { MAHASISWA: 7, DOSEN: 30, ADMIN: 60, SATPAM: 60 } as Record<Role, number>,
  /** RM-05: durasi maksimal sekali pinjam. */
  maxDurationHours: { MAHASISWA: 4, DOSEN: 6, ADMIN: 8, SATPAM: 8 } as Record<Role, number>,
  /** Batas kuota aktif per organisasi kemahasiswaan. */
  maxActivePerOrganization: 2,
  /** US-03: tenggang check-in sebelum slot dilepas. */
  noShowGraceMinutes: 30,
  /** Pintu check-in dibuka berapa menit sebelum jam mulai. */
  checkInOpenMinutesBefore: 45,
  /** Target tanggapan admin (KPI). */
  approvalTargetHours: 4,
  /** Jam operasional kampus (WITA). */
  operatingStartHour: OPERATING_START_HOUR,
  operatingEndHour: OPERATING_END_HOUR,
  /** Minimal & maksimal peserta. */
  minAttendees: 1,
};

export const ROOM_CATEGORIES: RoomCategory[] = [
  "STUDIO_DESAIN",
  "LAB_KOMPUTER",
  "RUANG_KELAS",
  "AULA",
  "GALERI",
];

export const FACILITY_OPTIONS = ["AC", "Proyektor", "Papan Tulis", "Sound System", "Komputer", "Wi-Fi"];

export function isBlockingStatus(status: BookingStatus): boolean {
  return BLOCKING_STATUSES.includes(status);
}

export function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

export function activeBookingsCount(bookings: Booking[]): number {
  return bookings.filter((booking) => ["pending", "approved", "checked_in"].includes(booking.status)).length;
}

export function canCancel(booking: Booking, now = new Date()): boolean {
  if (!["pending", "approved"].includes(booking.status)) return false;
  return new Date(booking.startAt).getTime() > now.getTime();
}

export function canCheckIn(booking: Booking, now = new Date()): boolean {
  if (booking.status !== "approved") return false;
  const start = new Date(booking.startAt).getTime();
  const end = new Date(booking.endAt).getTime();
  return now.getTime() >= start - RULES.checkInOpenMinutesBefore * 60_000 && now.getTime() <= end;
}

export function isHeld(booking: Booking, now = new Date()): boolean {
  if (booking.status !== "approved") return false;
  const deadline = new Date(booking.startAt).getTime() + RULES.noShowGraceMinutes * 60_000;
  return now.getTime() > deadline;
}

export function advanceWindowLabel(role: Role): string {
  const min = RULES.minAdvanceDays[role];
  const max = RULES.maxHorizonDays[role];
  if (min === 0) return `Hari ini s.d. H+${max}`;
  return `Minimal H-${min}, maksimal H+${max}`;
}

export function validateScheduleWindow(input: {
  role: Role;
  dateKey: string;
  startAt: Date;
  endAt: Date;
}): string | null {
  const { role, dateKey, startAt, endAt } = input;
  const dayOffset = diffDaysFromToday(dateKey);
  const min = RULES.minAdvanceDays[role];
  const max = RULES.maxHorizonDays[role];

  if (dayOffset < min) {
    return min === 0
      ? "Tanggal pemakaian tidak boleh di masa lalu."
      : `Pengajuan ${role === "MAHASISWA" ? "mahasiswa/UKM" : "Anda"} wajib dilakukan minimal H-${min} sebelum kegiatan.`;
  }
  if (dayOffset > max) {
    return `Pengajuan maksimal ${max} hari ke depan.`;
  }

  const startMinutes = startAt.getUTCHours() * 60 + startAt.getUTCMinutes();
  const endMinutes = endAt.getUTCHours() * 60 + endAt.getUTCMinutes();
  const openMinutes = (RULES.operatingStartHour - 8) * 60; // WITA → UTC (UTC+8)
  const closeMinutes = (RULES.operatingEndHour - 8) * 60;
  if (startAt.getUTCDate() !== endAt.getUTCDate() || startMinutes < openMinutes || endMinutes > closeMinutes) {
    return `Jam pemakaian harus di dalam jam operasional ${RULES.operatingStartHour}.00–${RULES.operatingEndHour}.00 WITA dan tidak melewati tengah malam.`;
  }

  const durationHours = (endAt.getTime() - startAt.getTime()) / 3_600_000;
  if (durationHours > RULES.maxDurationHours[role]) {
    return `Durasi maksimal peminjaman ${RULES.maxDurationHours[role]} jam.`;
  }
  if (durationHours < 1) {
    return "Durasi peminjaman minimal 1 jam.";
  }
  return null;
}

export function statusTone(status: BookingStatus): "neutral" | "free" | "pending" | "busy" {
  switch (status) {
    case "approved":
    case "checked_in":
      return "free";
    case "pending":
      return "pending";
    case "rejected":
    case "no_show":
      return "busy";
    default:
      return "neutral";
  }
}
