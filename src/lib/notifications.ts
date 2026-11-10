import "server-only";

import type { Booking, NotificationRecord, Room, Ticket, User } from "@/types";
import { getRepository } from "@/lib/db";
import { randomId } from "@/lib/crypto";
import {
  formatDateTimeWita,
  formatFullDateTimeWita,
  witaLongDate,
  witaTime,
} from "@/lib/time";
import { ticketPayload } from "@/lib/ticket";

/**
 * AP-02: notifikasi email.
 * Driver "mock" menyimpan ke outbox (dapat dilihat admin), driver "resend"
 * mengirim sungguhan bila RESEND_API_KEY tersedia.
 */

type SendArgs = {
  to: string;
  subject: string;
  body: string;
  bookingId?: string | null;
};

async function deliver(args: SendArgs): Promise<{ status: NotificationRecord["status"]; driver: string }> {
  const driver = process.env.EMAIL_DRIVER ?? "mock";
  const apiKey = process.env.RESEND_API_KEY;

  if (driver === "resend" && apiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "noreply@idb.ac.id",
          to: [args.to],
          subject: args.subject,
          text: args.body,
        }),
      });
      return { status: response.ok ? "sent" : "failed", driver: "resend" };
    } catch {
      return { status: "failed", driver: "resend" };
    }
  }

  // Mode mock: email dianggap terkirim ke outbox agar alur UAT tetap utuh.
  return { status: "sent", driver: "mock" };
}

export async function sendNotification(args: SendArgs): Promise<NotificationRecord> {
  const { status, driver } = await deliver(args);
  const record: NotificationRecord = {
    id: randomId(),
    bookingId: args.bookingId ?? null,
    recipient: args.to,
    subject: args.subject,
    body: args.body,
    status,
    driver,
    createdAt: new Date().toISOString(),
    sentAt: status === "sent" ? new Date().toISOString() : null,
  };
  try {
    return await getRepository().insertNotification(record);
  } catch (error) {
    console.error("[notifications] gagal menyimpan outbox:", error);
    return record;
  }
}

function signature(): string {
  return [
    "Salam,",
    "Sistem Peminjaman Ruangan IDB Bali",
    "Sarana Prasarana — Institut Desain dan Bisnis Bali",
    "",
    "Email ini dikirim otomatis. Mohon tidak membalas email ini.",
  ].join("\n");
}

export function notificationForSubmission(booking: Booking, room: Room, user: User): { subject: string; body: string } {
  return {
    subject: `[IDB Ruangan] Pengajuan ${booking.code} diterima`,
    body: [
      `Halo ${user.fullName},`,
      "",
      `Pengajuan peminjaman Anda telah kami terima dan sedang menunggu persetujuan Sarana Prasarana.`,
      "",
      `Kode pengajuan : ${booking.code}`,
      `Ruangan        : ${room.name} (${room.code}) — ${room.building}, lantai ${room.floor}`,
      `Kegiatan       : ${booking.eventName}`,
      `Waktu          : ${formatFullDateTimeWita(booking.startAt)} – ${witaTime(booking.endAt)} WITA`,
      `Peserta        : ${booking.attendees} orang`,
      "",
      `Anda dapat memantau status pengajuan pada menu Riwayat. Tiket QR akan diterbitkan otomatis begitu disetujui.`,
      "",
      signature(),
    ].join("\n"),
  };
}

export function notificationForApproval(
  booking: Booking,
  room: Room,
  user: User,
  ticket: Ticket,
): { subject: string; body: string } {
  return {
    subject: `[IDB Ruangan] Pengajuan ${booking.code} disetujui`,
    body: [
      `Halo ${user.fullName},`,
      "",
      `Pengajuan peminjaman ruangan Anda telah disetujui. Tiket digital berikut adalah bukti izin resmi di gedung.`,
      "",
      `Kode tiket     : ${ticket.code}`,
      `Ruangan        : ${room.name} (${room.code}) — ${room.building}, lantai ${room.floor}`,
      `Kegiatan       : ${booking.eventName}`,
      `Tanggal        : ${witaLongDate(booking.startAt)}`,
      `Waktu          : ${witaTime(booking.startAt)} – ${witaTime(booking.endAt)} WITA`,
      "",
      `Tunjukkan QR Code tiket kepada petugas gedung saat tiba. Check-in dibuka 45 menit sebelum jam mulai;`,
      `keterlambatan lebih dari 30 menit menyebabkan slot dilepas otomatis (no-show).`,
      "",
      `Isi QR: ${ticketPayload(ticket.code)}`,
      "",
      signature(),
    ].join("\n"),
  };
}

export function notificationForRejection(
  booking: Booking,
  room: Room,
  user: User,
  reason: string,
): { subject: string; body: string } {
  return {
    subject: `[IDB Ruangan] Pengajuan ${booking.code} ditolak`,
    body: [
      `Halo ${user.fullName},`,
      "",
      `Mohon maaf, pengajuan peminjaman berikut belum dapat disetujui.`,
      "",
      `Kode pengajuan : ${booking.code}`,
      `Ruangan        : ${room.name} (${room.code})`,
      `Kegiatan       : ${booking.eventName}`,
      `Waktu          : ${formatDateTimeWita(booking.startAt)}`,
      "",
      `Alasan penolakan:`,
      reason,
      "",
      `Anda dapat mengajukan ulang dengan jadwal atau ruangan lain melalui portal.`,
      "",
      signature(),
    ].join("\n"),
  };
}

export function notificationForCancellation(
  booking: Booking,
  room: Room,
  user: User,
  reason: string,
): { subject: string; body: string } {
  return {
    subject: `[IDB Ruangan] Pengajuan ${booking.code} dibatalkan`,
    body: [
      `Halo ${user.fullName},`,
      "",
      `Pengajuan berikut telah dibatalkan dan slotnya dibuka kembali untuk sivitas lainnya.`,
      "",
      `Kode pengajuan : ${booking.code}`,
      `Ruangan        : ${room.name} (${room.code})`,
      `Waktu          : ${formatDateTimeWita(booking.startAt)}`,
      `Alasan         : ${reason}`,
      "",
      signature(),
    ].join("\n"),
  };
}

export function notificationForNoShow(booking: Booking, room: Room, user: User): { subject: string; body: string } {
  return {
    subject: `[IDB Ruangan] Slot ${booking.code} dilepas karena no-show`,
    body: [
      `Halo ${user.fullName},`,
      "",
      `Peminjaman berikut tidak melakukan check-in hingga 30 menit setelah jam mulai, sehingga slot dilepas:`,
      "",
      `Kode pengajuan : ${booking.code}`,
      `Ruangan        : ${room.name} (${room.code})`,
      `Waktu          : ${formatDateTimeWita(booking.startAt)}`,
      "",
      `Catatan no-show saat ini: ${user.noShowStrikes + 1}. Dua catatan no-show dapat membekukan hak pinjam.`,
      "",
      signature(),
    ].join("\n"),
  };
}
