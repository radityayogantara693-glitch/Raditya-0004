import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  AuditLog,
  Booking,
  NotificationRecord,
  Room,
  Ticket,
  User,
} from "@/types";
import type { BookingQuery, CheckInResult, Repository, Result } from "./repository";
import { buildSeed, type DbShape } from "./seed";
import { ticketCode, randomId, randomToken } from "@/lib/crypto";
import { RULES } from "@/lib/rules";

/**
 * Driver demo lokal: JSON store dengan queue tulis serial.
 * Pemeriksaan bentrok berjalan di dalam queue sehingga dua permintaan
 * bersamaan tidak bisa lolos.
 */

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

type GlobalCache = typeof globalThis & {
  __idbDb?: DbShape | null;
  __idbQueue?: Promise<unknown>;
};

const cache = globalThis as GlobalCache;

async function persist(db: DbShape): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, DB_FILE);
  } catch (error) {
    // Filesystem read-only (mis. Vercel) atau gagal tulis: tetap lanjut dengan
    // data di memori agar aplikasi tidak crash. Data tidak persisten.
    console.warn("[db] gagal menyimpan .data/db.json; memakai data di memori:", (error as Error).message);
  }
}

async function load(): Promise<DbShape> {
  if (cache.__idbDb) return cache.__idbDb;

  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as DbShape;
    if (!Array.isArray(parsed.users) || !Array.isArray(parsed.rooms) || !Array.isArray(parsed.bookings)) {
      throw new Error("Struktur basis data demo tidak valid.");
    }
    parsed.tickets ??= [];
    parsed.notifications ??= [];
    parsed.audits ??= [];
    cache.__idbDb = parsed;
  } catch (error) {
    const isMissing = (error as NodeJS.ErrnoException)?.code === "ENOENT";
    if (!isMissing && process.env.NODE_ENV !== "test") {
      console.warn("[db] gagal membaca .data/db.json, memuat data demo baru:", (error as Error).message);
    }
    const seeded = buildSeed();
    cache.__idbDb = seeded;
    await persist(seeded);
  }

  return cache.__idbDb;
}

async function withWrite<T>(operation: (db: DbShape) => T | Promise<T>): Promise<T> {
  const run = async () => {
    const db = await load();
    const result = await operation(db);
    await persist(db);
    return result;
  };
  const previous = (cache.__idbQueue ?? Promise.resolve()).catch(() => undefined);
  const queued = previous.then(run, run);
  cache.__idbQueue = queued.then(
    () => undefined,
    () => undefined,
  );
  return queued;
}

async function withRead<T>(operation: (db: DbShape) => T): Promise<T> {
  await (cache.__idbQueue ?? Promise.resolve()).catch(() => undefined);
  return operation(await load());
}

const nowIso = () => new Date().toISOString();

function activeStatuses(status: Booking["status"]) {
  return status === "pending" || status === "approved" || status === "checked_in";
}

export const localRepository: Repository = {
  driver: "local",

  async getUserByEmail(email) {
    return withRead((db) => db.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null);
  },

  async getUserById(id) {
    return withRead((db) => db.users.find((user) => user.id === id) ?? null);
  },

  async listUsers() {
    return withRead((db) => [...db.users]);
  },

  async updateUser(id, patch) {
    return withWrite((db) => {
      const user = db.users.find((item) => item.id === id);
      if (!user) throw new Error("Pengguna tidak ditemukan.");
      Object.assign(user, patch);
      return user;
    });
  },

  async listRooms(options) {
    return withRead((db) =>
      db.rooms
        .filter((room) => options?.includeInactive || room.isActive)
        .sort((a, b) => a.code.localeCompare(b.code)),
    );
  },

  async getRoom(id) {
    return withRead((db) => db.rooms.find((room) => room.id === id) ?? null);
  },

  async getRoomByCode(code) {
    return withRead((db) => db.rooms.find((room) => room.code.toLowerCase() === code.toLowerCase()) ?? null);
  },

  async createRoom(room) {
    return withWrite((db) => {
      if (db.rooms.some((item) => item.code === room.code)) {
        throw new Error(`Kode ruangan ${room.code} sudah dipakai.`);
      }
      db.rooms.push(room);
      return room;
    });
  },

  async updateRoom(id, patch) {
    return withWrite((db) => {
      const room = db.rooms.find((item) => item.id === id);
      if (!room) throw new Error("Ruangan tidak ditemukan.");
      Object.assign(room, patch);
      return room;
    });
  },

  async listBookings(query = {}) {
    return withRead((db) => {
      let rows = [...db.bookings];
      if (query.userId) rows = rows.filter((item) => item.userId === query.userId);
      if (query.roomId) rows = rows.filter((item) => item.roomId === query.roomId);
      if (query.statuses?.length) rows = rows.filter((item) => query.statuses!.includes(item.status));
      if (query.from) rows = rows.filter((item) => new Date(item.endAt) > new Date(query.from!));
      if (query.to) rows = rows.filter((item) => new Date(item.startAt) < new Date(query.to!));
      rows.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      if (query.limit) rows = rows.slice(0, query.limit);
      return rows;
    });
  },

  async getBooking(id) {
    return withRead((db) => db.bookings.find((item) => item.id === id) ?? null);
  },

  async getBookingByCode(code) {
    return withRead((db) => db.bookings.find((item) => item.code === code) ?? null);
  },

  async countActiveByOrganization(organization) {
    return withRead(
      (db) =>
        db.bookings.filter(
          (item) => item.organization === organization && activeStatuses(item.status),
        ).length,
    );
  },

  async createBooking(booking) {
    return withWrite<Result<Booking>>((db) => {
      const conflict = db.bookings.find(
        (item) =>
          item.roomId === booking.roomId &&
          activeStatuses(item.status) &&
          new Date(item.startAt) < new Date(booking.endAt) &&
          new Date(booking.startAt) < new Date(item.endAt),
      );
      if (conflict) {
        return {
          ok: false,
          error: `Slot ruangan sudah dipakai untuk "${conflict.eventName}". Pilih jam atau ruangan lain.`,
        };
      }

      if (db.bookings.some((item) => item.code === booking.code)) {
        return { ok: false, error: "Kode pengajuan bentrok, silakan kirim ulang." };
      }

      db.bookings.push(booking);
      return { ok: true, value: booking };
    });
  },

  async approveBooking(bookingId, adminId) {
    return withWrite<Result<{ booking: Booking; ticket: Ticket }>>((db) => {
      const booking = db.bookings.find((item) => item.id === bookingId);
      if (!booking) return { ok: false, error: "Pengajuan tidak ditemukan." };
      if (booking.status !== "pending") {
        return { ok: false, error: "Hanya pengajuan berstatus menunggu yang dapat disetujui." };
      }

      const conflict = db.bookings.find(
        (item) =>
          item.id !== booking.id &&
          item.roomId === booking.roomId &&
          activeStatuses(item.status) &&
          item.status !== "pending" &&
          new Date(item.startAt) < new Date(booking.endAt) &&
          new Date(booking.startAt) < new Date(item.endAt),
      );
      if (conflict) {
        return { ok: false, error: `Tidak dapat disetujui: bentrok dengan "${conflict.eventName}".` };
      }

      booking.status = "approved";
      booking.decidedBy = adminId;
      booking.decidedAt = nowIso();
      booking.updatedAt = nowIso();

      const ticket: Ticket = {
        id: randomId(),
        bookingId: booking.id,
        code: ticketCode(),
        token: randomToken(),
        status: "issued",
        issuedAt: nowIso(),
        expiresAt: booking.endAt,
        usedAt: null,
        usedBy: null,
      };
      db.tickets.push(ticket);

      return { ok: true, value: { booking, ticket } };
    });
  },

  async rejectBooking(bookingId, adminId, reason) {
    return withWrite<Result<Booking>>((db) => {
      const booking = db.bookings.find((item) => item.id === bookingId);
      if (!booking) return { ok: false, error: "Pengajuan tidak ditemukan." };
      if (booking.status !== "pending") {
        return { ok: false, error: "Hanya pengajuan berstatus menunggu yang dapat ditolak." };
      }
      booking.status = "rejected";
      booking.rejectionReason = reason;
      booking.decidedBy = adminId;
      booking.decidedAt = nowIso();
      booking.updatedAt = nowIso();
      return { ok: true, value: booking };
    });
  },

  async cancelBooking(bookingId, userId, reason) {
    return withWrite<Result<Booking>>((db) => {
      const booking = db.bookings.find((item) => item.id === bookingId);
      if (!booking) return { ok: false, error: "Pengajuan tidak ditemukan." };
      if (booking.userId !== userId) return { ok: false, error: "Anda tidak berhak membatalkan pengajuan ini." };
      if (!["pending", "approved"].includes(booking.status)) {
        return { ok: false, error: "Pengajuan ini tidak dapat dibatalkan lagi." };
      }
      if (new Date(booking.startAt).getTime() <= Date.now()) {
        return { ok: false, error: "Pembatalan hanya dapat dilakukan sebelum jam mulai." };
      }

      booking.status = "cancelled";
      booking.cancelReason = reason;
      booking.cancelledAt = nowIso();
      booking.updatedAt = nowIso();

      for (const ticket of db.tickets) {
        if (ticket.bookingId === booking.id && ticket.status === "issued") {
          ticket.status = "revoked";
        }
      }
      return { ok: true, value: booking };
    });
  },

  async checkInByCode(code, officerId, now) {
    const normalized = code.trim().toUpperCase();
    return withWrite<Result<CheckInResult>>((db) => {
      const ticket = db.tickets.find(
        (item) => item.code.toUpperCase() === normalized || item.token === code.trim(),
      );
      if (!ticket) return { ok: false, error: "Tiket tidak ditemukan. Periksa kembali kode pada QR." };

      const booking = db.bookings.find((item) => item.id === ticket.bookingId);
      if (!booking) return { ok: false, error: "Tiket tidak terhubung dengan pengajuan mana pun." };

      if (ticket.status === "revoked") return { ok: false, error: "Tiket sudah dicabut karena pengajuan dibatalkan." };
      if (ticket.status === "used") return { ok: false, error: `Tiket sudah digunakan pada ${booking.checkedInAt ?? ticket.usedAt}.` };
      if (booking.status === "cancelled") return { ok: false, error: "Pengajuan sudah dibatalkan." };
      if (booking.status === "no_show") return { ok: false, error: "Slot sudah dilepas karena no-show." };
      if (booking.status === "completed") return { ok: false, error: "Sesi pemakaian sudah selesai." };
      if (booking.status !== "approved") {
        return { ok: false, error: "Tiket belum aktif. Pengajuan harus disetujui admin terlebih dahulu." };
      }

      const start = new Date(booking.startAt).getTime();
      const end = new Date(booking.endAt).getTime();
      const current = now.getTime();
      if (current < start - RULES.checkInOpenMinutesBefore * 60_000) {
        return { ok: false, error: `Check-in dibuka ${RULES.checkInOpenMinutesBefore} menit sebelum jam mulai.` };
      }
      if (current > end) return { ok: false, error: "Waktu pemakaian sudah berakhir." };

      booking.status = "checked_in";
      booking.checkedInAt = now.toISOString();
      booking.checkedInBy = officerId;
      booking.updatedAt = now.toISOString();
      ticket.status = "used";
      ticket.usedAt = now.toISOString();
      ticket.usedBy = officerId;

      return { ok: true, value: { booking, ticket } };
    });
  },

  async releaseNoShows(now) {
    return withWrite((db) => {
      const released: Booking[] = [];
      for (const booking of db.bookings) {
        if (booking.status !== "approved") continue;
        const deadline = new Date(booking.startAt).getTime() + RULES.noShowGraceMinutes * 60_000;
        if (now.getTime() <= deadline) continue;

        booking.status = "no_show";
        booking.updatedAt = now.toISOString();
        released.push(booking);

        for (const ticket of db.tickets) {
          if (ticket.bookingId === booking.id && ticket.status === "issued") {
            ticket.status = "revoked";
          }
        }
        const owner = db.users.find((user) => user.id === booking.userId);
        if (owner) owner.noShowStrikes += 1;
      }
      return released;
    });
  },

  async completeFinished(now) {
    return withWrite((db) => {
      const completed: Booking[] = [];
      for (const booking of db.bookings) {
        if (!["approved", "checked_in"].includes(booking.status)) continue;
        if (new Date(booking.endAt).getTime() > now.getTime()) continue;
        booking.status = "completed";
        booking.updatedAt = now.toISOString();
        completed.push(booking);
        for (const ticket of db.tickets) {
          if (ticket.bookingId === booking.id && ticket.status === "issued") ticket.status = "expired";
        }
      }
      return completed;
    });
  },

  async updateBooking(id, patch) {
    return withWrite((db) => {
      const booking = db.bookings.find((item) => item.id === id);
      if (!booking) throw new Error("Pengajuan tidak ditemukan.");
      Object.assign(booking, patch, { updatedAt: nowIso() });
      return booking;
    });
  },

  async getTicketByBooking(bookingId) {
    return withRead((db) => db.tickets.find((item) => item.bookingId === bookingId) ?? null);
  },

  async getTicketByCode(code) {
    const normalized = code.trim().toUpperCase();
    return withRead(
      (db) =>
        db.tickets.find((item) => item.code.toUpperCase() === normalized || item.token === code.trim()) ?? null,
    );
  },

  async saveTicket(ticket) {
    return withWrite((db) => {
      const index = db.tickets.findIndex((item) => item.id === ticket.id);
      if (index >= 0) db.tickets[index] = ticket;
      else db.tickets.push(ticket);
      return ticket;
    });
  },

  async insertNotification(record) {
    return withWrite((db) => {
      db.notifications.unshift(record);
      return record;
    });
  },

  async listNotifications(limit = 50) {
    return withRead((db) => db.notifications.slice(0, limit));
  },

  async insertAudit(log) {
    await withWrite((db) => {
      db.audits.unshift(log);
      if (db.audits.length > 500) db.audits.length = 500;
    });
  },

  async listAudits(limit = 50) {
    return withRead((db) => db.audits.slice(0, limit));
  },
};

export type { DbShape };
