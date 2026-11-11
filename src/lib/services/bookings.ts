import "server-only";

import { revalidatePath } from "next/cache";

import type { Booking, Room, User } from "@/types";
import { getRepository } from "@/lib/db";
import { randomId } from "@/lib/crypto";
import { RULES, validateScheduleWindow } from "@/lib/rules";
import { bookingSchema, cancelSchema, checkInSchema, fieldErrors, rejectSchema } from "@/lib/validation";
import { witaDateKey, witaToInstant } from "@/lib/time";
import type { ActionState } from "@/lib/action-state";
import {
  notificationForApproval,
  notificationForCancellation,
  notificationForNoShow,
  notificationForRejection,
  notificationForSubmission,
  sendNotification,
} from "@/lib/notifications";

export type { ActionState };

function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

function refreshViews() {
  for (const path of ["/dashboard", "/ruangan", "/kalender", "/ajukan", "/riwayat", "/admin", "/checkin"]) {
    revalidatePath(path);
  }
}

async function audit(actorId: string | null, action: string, entity: string, entityId: string | null, meta?: Record<string, unknown>) {
  try {
    await getRepository().insertAudit({
      id: randomId(),
      actorId,
      action,
      entity,
      entityId,
      meta: meta ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[audit] gagal mencatat aktivitas:", error);
  }
}

async function nextBookingCode(repo = getRepository()): Promise<string> {
  const today = witaDateKey(new Date()).replaceAll("-", "").slice(2);
  const prefix = `BK-${today}-`;
  const bookings = await repo.listBookings();
  const todayCount = bookings.filter((item) => item.code.startsWith(prefix)).length;
  return `${prefix}${String(todayCount + 1).padStart(3, "0")}`;
}

export async function findAlternativeRooms(input: {
  dateKey: string;
  startTime: string;
  endTime: string;
  excludeRoomId: string;
  attendees: number;
}): Promise<Array<{ id: string; name: string; code: string }>> {
  const repo = getRepository();
  const rooms = await repo.listRooms();
  const startAt = witaToInstant(input.dateKey, input.startTime).toISOString();
  const endAt = witaToInstant(input.dateKey, input.endTime).toISOString();

  const bookings = await repo.listBookings({
    statuses: ["pending", "approved", "checked_in"],
    from: startAt,
    to: endAt,
  });

  return rooms
    .filter((room) => room.id !== input.excludeRoomId && room.capacity >= input.attendees)
    .filter((room) => !bookings.some((booking) => booking.roomId === room.id))
    .map((room) => ({ id: room.id, name: room.name, code: room.code }))
    .slice(0, 4);
}

export async function submitBookingAction(user: User, formData: FormData): Promise<ActionState> {
  const repo = getRepository();
  const raw = formValues(formData);
  const parsed = bookingSchema.safeParse(raw);

  if (!parsed.success) {
    return { status: "error", message: "Periksa kembali isian formulir.", errors: fieldErrors(parsed.error), values: raw };
  }

  const input = parsed.data;

  if (["MAHASISWA", "DOSEN"].includes(user.role) && user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
    return {
      status: "error",
      message: `Hak pinjam Anda dibekukan sampai ${new Date(user.suspendedUntil).toLocaleDateString("id-ID")}. Hubungi Sarpras untuk informasi lebih lanjut.`,
      values: raw,
    };
  }

  const room = await repo.getRoom(input.roomId);
  if (!room) {
    return { status: "error", message: "Ruangan tidak ditemukan.", values: raw };
  }
  if (!room.isActive) {
    return { status: "error", message: `Ruangan ${room.name} sedang tidak dioperasikan.`, values: raw };
  }

  const startAt = witaToInstant(input.date, input.startTime);
  const endAt = witaToInstant(input.date, input.endTime);

  const windowError = validateScheduleWindow({ role: user.role, dateKey: input.date, startAt, endAt });
  if (windowError) {
    return { status: "error", message: windowError, errors: { date: windowError }, values: raw };
  }

  if (input.attendees > room.capacity) {
    const message = `Kapasitas ${room.name} hanya ${room.capacity} orang, sedangkan estimasi peserta ${input.attendees}.`;
    return { status: "error", message, errors: { attendees: message }, values: raw };
  }

  if (user.role === "MAHASISWA" && user.organization) {
    const active = await repo.countActiveByOrganization(user.organization);
    if (active >= RULES.maxActivePerOrganization) {
      return {
        status: "error",
        message: `${user.organization} sudah memiliki ${active} pengajuan aktif. Batas maksimal ${RULES.maxActivePerOrganization} pengajuan aktif per organisasi — selesaikan atau batalkan salah satu terlebih dahulu.`,
        values: raw,
      };
    }
  }

  const overlapping = await repo.listBookings({
    roomId: room.id,
    statuses: ["pending", "approved", "checked_in"],
    from: startAt.toISOString(),
    to: endAt.toISOString(),
  });

  if (overlapping.length > 0) {
    const alternatives = await findAlternativeRooms({
      dateKey: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      excludeRoomId: room.id,
      attendees: input.attendees,
    });
    return {
      status: "error",
      message: `Slot ${room.name} pada ${input.startTime}–${input.endTime} WITA sudah terpakai. Pilih waktu lain${alternatives.length ? " atau salah satu ruangan alternatif di bawah" : ""}.`,
      errors: { roomId: "Ruangan ini sudah terisi pada jam tersebut." },
      alternatives,
      values: raw,
    };
  }

  const booking: Booking = {
    id: randomId(),
    code: await nextBookingCode(repo),
    roomId: room.id,
    userId: user.id,
    organization: user.organization,
    eventName: input.eventName,
    purpose: input.purpose,
    attendees: input.attendees,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    status: "pending",
    rejectionReason: null,
    decidedBy: null,
    decidedAt: null,
    checkedInAt: null,
    checkedInBy: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await repo.createBooking(booking);
  if (!result.ok) {
    return { status: "error", message: result.error, values: raw };
  }

  // Gunakan objek hasil simpan agar tautan, audit, dan notifikasi memakai
  // ID yang benar (driver lokal mengembalikan objek yang tersimpan).
  const saved = result.value;

  await audit(user.id, "booking.created", "booking", saved.id, {
    roomId: room.id,
    code: saved.code,
  });

  const notification = notificationForSubmission(saved, room, user);
  await sendNotification({ to: user.email, bookingId: saved.id, ...notification });

  refreshViews();
  return {
    status: "success",
    message: `Pengajuan ${saved.code} terkirim. Admin Sarpras akan meninjau dalam target ${RULES.approvalTargetHours} jam kerja.`,
    bookingId: saved.id,
  };
}

export async function approveBookingAction(admin: User, formData: FormData): Promise<ActionState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return { status: "error", message: "Pengajuan tidak dikenali." };

  const repo = getRepository();
  const existing = await repo.getBooking(bookingId);
  if (!existing) return { status: "error", message: "Pengajuan tidak ditemukan." };

  const result = await repo.approveBooking(bookingId, admin.id);
  if (!result.ok) return { status: "error", message: result.error };

  const [room, owner] = await Promise.all([repo.getRoom(existing.roomId), repo.getUserById(existing.userId)]);
  if (room && owner) {
    const notification = notificationForApproval(result.value.booking, room, owner, result.value.ticket);
    await sendNotification({ to: owner.email, bookingId, ...notification });
  }

  await audit(admin.id, "booking.approved", "booking", bookingId, { code: result.value.booking.code });
  refreshViews();
  return {
    status: "success",
    message: `Pengajuan ${result.value.booking.code} disetujui. Tiket ${result.value.ticket.code} sudah dikirim ke pemohon.`,
    ticketCode: result.value.ticket.code,
  };
}

export async function rejectBookingAction(admin: User, formData: FormData): Promise<ActionState> {
  const parsed = rejectSchema.safeParse({
    bookingId: formData.get("bookingId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Periksa alasan penolakan.", errors: fieldErrors(parsed.error) };
  }

  const repo = getRepository();
  const existing = await repo.getBooking(parsed.data.bookingId);
  if (!existing) return { status: "error", message: "Pengajuan tidak ditemukan." };

  const result = await repo.rejectBooking(parsed.data.bookingId, admin.id, parsed.data.reason);
  if (!result.ok) return { status: "error", message: result.error };

  const [room, owner] = await Promise.all([repo.getRoom(existing.roomId), repo.getUserById(existing.userId)]);
  if (room && owner) {
    const notification = notificationForRejection(result.value, room, owner, parsed.data.reason);
    await sendNotification({ to: owner.email, bookingId: existing.id, ...notification });
  }

  await audit(admin.id, "booking.rejected", "booking", existing.id, { reason: parsed.data.reason });
  refreshViews();
  return { status: "success", message: `Pengajuan ${existing.code} ditolak dan alasan dikirim ke pemohon.` };
}

export async function cancelBookingAction(user: User, formData: FormData): Promise<ActionState> {
  const parsed = cancelSchema.safeParse({
    bookingId: formData.get("bookingId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Periksa alasan pembatalan.", errors: fieldErrors(parsed.error) };
  }

  const repo = getRepository();
  const existing = await repo.getBooking(parsed.data.bookingId);
  if (!existing) return { status: "error", message: "Pengajuan tidak ditemukan." };

  const result = await repo.cancelBooking(parsed.data.bookingId, user.id, parsed.data.reason);
  if (!result.ok) return { status: "error", message: result.error };

  const room = await repo.getRoom(existing.roomId);
  if (room) {
    const notification = notificationForCancellation(result.value, room, user, parsed.data.reason);
    await sendNotification({ to: user.email, bookingId: existing.id, ...notification });
  }

  await audit(user.id, "booking.cancelled", "booking", existing.id, { reason: parsed.data.reason });
  refreshViews();
  return { status: "success", message: `Pengajuan ${existing.code} dibatalkan dan slotnya dibuka kembali.` };
}

export async function checkInAction(officer: User, formData: FormData): Promise<ActionState> {
  const parsed = checkInSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return { status: "error", message: fieldErrors(parsed.error).code ?? "Kode tiket tidak valid." };
  }

  const repo = getRepository();
  const result = await repo.checkInByCode(parsed.data.code, officer.id, new Date());
  if (!result.ok) {
    await audit(officer.id, "ticket.checkin.failed", "ticket", parsed.data.code, { error: result.error });
    return { status: "error", message: result.error };
  }

  const { booking, ticket } = result.value;
  await audit(officer.id, "ticket.checkin", "booking", booking.id, { code: booking.code, ticket: ticket.code });
  refreshViews();
  return {
    status: "success",
    message: `Check-in berhasil untuk ${booking.eventName} (${booking.code}).`,
    bookingId: booking.id,
    ticketCode: ticket.code,
  };
}

/** US-03 + penutupan sesi otomatis. Dipanggil cron / tombol admin. */
export async function runMaintenance(actor?: User): Promise<{ released: number; completed: number }> {
  const repo = getRepository();
  const now = new Date();
  const released = await repo.releaseNoShows(now);
  const completed = await repo.completeFinished(now);

  for (const booking of released) {
    const [room, owner] = await Promise.all([repo.getRoom(booking.roomId), repo.getUserById(booking.userId)]);
    if (room && owner) {
      const notification = notificationForNoShow(booking, room, owner);
      await sendNotification({ to: owner.email, bookingId: booking.id, ...notification });
    }
  }

  if (released.length || completed.length) {
    await audit(actor?.id ?? null, "maintenance.sweep", "system", null, {
      released: released.length,
      completed: completed.length,
    });
    refreshViews();
  }

  return { released: released.length, completed: completed.length };
}

export function describeRoom(room: Room): string {
  return `${room.name} (${room.code}) · ${room.building} lt. ${room.floor} · ${room.capacity} orang`;
}
