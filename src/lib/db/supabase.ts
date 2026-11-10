import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Booking, NotificationRecord, Room, Ticket, User } from "@/types";
import type { BookingQuery, CheckInResult, Repository, Result } from "./repository";

/**
 * Driver produksi: Supabase/PostgreSQL.
 * Semua mutasi yang rawan balapan dijalankan lewat RPC PL/pgSQL yang memakai
 * advisory lock + exclusion constraint (lihat supabase/migrations/0001_init.sql).
 */

type Row = Record<string, unknown>;

const str = (value: unknown): string => (value == null ? "" : String(value));
const nullableStr = (value: unknown): string | null => (value == null ? null : String(value));
const num = (value: unknown): number => Number(value ?? 0);

function mapUser(row: Row): User {
  return {
    id: str(row.id),
    ssoId: str(row.sso_id),
    email: str(row.email),
    fullName: str(row.full_name),
    role: row.role as User["role"],
    organization: nullableStr(row.organization),
    isActive: Boolean(row.is_active),
    noShowStrikes: num(row.no_show_strikes),
    suspendedUntil: nullableStr(row.suspended_until),
    createdAt: str(row.created_at),
  };
}

function mapRoom(row: Row): Room {
  return {
    id: str(row.id),
    code: str(row.code),
    name: str(row.name),
    category: row.category as Room["category"],
    building: str(row.building),
    floor: num(row.floor),
    capacity: num(row.capacity),
    facilities: Array.isArray(row.facilities) ? (row.facilities as string[]) : [],
    description: str(row.description),
    isActive: Boolean(row.is_active),
    createdAt: str(row.created_at),
  };
}

function mapBooking(row: Row): Booking {
  return {
    id: str(row.id),
    code: str(row.code),
    roomId: str(row.room_id),
    userId: str(row.user_id),
    organization: nullableStr(row.organization),
    eventName: str(row.event_name),
    purpose: str(row.purpose),
    attendees: num(row.attendees),
    startAt: str(row.start_at),
    endAt: str(row.end_at),
    status: row.status as Booking["status"],
    rejectionReason: nullableStr(row.rejection_reason),
    decidedBy: nullableStr(row.decided_by),
    decidedAt: nullableStr(row.decided_at),
    checkedInAt: nullableStr(row.checked_in_at),
    checkedInBy: nullableStr(row.checked_in_by),
    cancelledAt: nullableStr(row.cancelled_at),
    cancelReason: nullableStr(row.cancel_reason),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

function mapTicket(row: Row): Ticket {
  return {
    id: str(row.id),
    bookingId: str(row.booking_id),
    code: str(row.code),
    token: str(row.token),
    status: row.status as Ticket["status"],
    issuedAt: str(row.issued_at),
    expiresAt: str(row.expires_at),
    usedAt: nullableStr(row.used_at),
    usedBy: nullableStr(row.used_by),
  };
}

function mapNotification(row: Row): NotificationRecord {
  return {
    id: str(row.id),
    bookingId: nullableStr(row.booking_id),
    recipient: str(row.recipient),
    subject: str(row.subject),
    body: str(row.body),
    status: row.status as NotificationRecord["status"],
    driver: str(row.driver),
    createdAt: str(row.created_at),
    sentAt: nullableStr(row.sent_at),
  };
}

function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? "Kesalahan basis data.");
}

export function createSupabaseRepository(url: string, serviceKey: string): Repository {
  const supabase: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase.rpc(name, args);
    if (error) fail(error);
    return data as T;
  }

  return {
    driver: "supabase",

    async getUserByEmail(email) {
      const { data, error } = await supabase.from("users").select("*").ilike("email", email).maybeSingle();
      if (error) fail(error);
      return data ? mapUser(data as Row) : null;
    },

    async getUserById(id) {
      const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
      if (error) fail(error);
      return data ? mapUser(data as Row) : null;
    },

    async listUsers() {
      const { data, error } = await supabase.from("users").select("*").order("full_name");
      if (error) fail(error);
      return (data ?? []).map((row) => mapUser(row as Row));
    },

    async updateUser(id, patch) {
      const payload: Row = {};
      if (patch.fullName !== undefined) payload.full_name = patch.fullName;
      if (patch.organization !== undefined) payload.organization = patch.organization;
      if (patch.isActive !== undefined) payload.is_active = patch.isActive;
      if (patch.noShowStrikes !== undefined) payload.no_show_strikes = patch.noShowStrikes;
      if (patch.suspendedUntil !== undefined) payload.suspended_until = patch.suspendedUntil;
      if (patch.role !== undefined) payload.role = patch.role;
      const { data, error } = await supabase.from("users").update(payload).eq("id", id).select("*").single();
      if (error) fail(error);
      return mapUser(data as Row);
    },

    async listRooms(options) {
      let query = supabase.from("rooms").select("*").order("code");
      if (!options?.includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) fail(error);
      return (data ?? []).map((row) => mapRoom(row as Row));
    },

    async getRoom(id) {
      const { data, error } = await supabase.from("rooms").select("*").eq("id", id).maybeSingle();
      if (error) fail(error);
      return data ? mapRoom(data as Row) : null;
    },

    async getRoomByCode(code) {
      const { data, error } = await supabase.from("rooms").select("*").ilike("code", code).maybeSingle();
      if (error) fail(error);
      return data ? mapRoom(data as Row) : null;
    },

    async createRoom(room) {
      const { data, error } = await supabase
        .from("rooms")
        .insert({
          id: room.id,
          code: room.code,
          name: room.name,
          category: room.category,
          building: room.building,
          floor: room.floor,
          capacity: room.capacity,
          facilities: room.facilities,
          description: room.description,
          is_active: room.isActive,
        })
        .select("*")
        .single();
      if (error) fail(error);
      return mapRoom(data as Row);
    },

    async updateRoom(id, patch) {
      const payload: Row = {};
      if (patch.code !== undefined) payload.code = patch.code;
      if (patch.name !== undefined) payload.name = patch.name;
      if (patch.category !== undefined) payload.category = patch.category;
      if (patch.building !== undefined) payload.building = patch.building;
      if (patch.floor !== undefined) payload.floor = patch.floor;
      if (patch.capacity !== undefined) payload.capacity = patch.capacity;
      if (patch.facilities !== undefined) payload.facilities = patch.facilities;
      if (patch.description !== undefined) payload.description = patch.description;
      if (patch.isActive !== undefined) payload.is_active = patch.isActive;
      const { data, error } = await supabase.from("rooms").update(payload).eq("id", id).select("*").single();
      if (error) fail(error);
      return mapRoom(data as Row);
    },

    async listBookings(query: BookingQuery = {}) {
      let request = supabase.from("bookings").select("*").order("start_at");
      if (query.userId) request = request.eq("user_id", query.userId);
      if (query.roomId) request = request.eq("room_id", query.roomId);
      if (query.statuses?.length) request = request.in("status", query.statuses);
      if (query.from) request = request.gt("end_at", query.from);
      if (query.to) request = request.lt("start_at", query.to);
      if (query.limit) request = request.limit(query.limit);
      const { data, error } = await request;
      if (error) fail(error);
      return (data ?? []).map((row) => mapBooking(row as Row));
    },

    async getBooking(id) {
      const { data, error } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
      if (error) fail(error);
      return data ? mapBooking(data as Row) : null;
    },

    async getBookingByCode(code) {
      const { data, error } = await supabase.from("bookings").select("*").eq("code", code).maybeSingle();
      if (error) fail(error);
      return data ? mapBooking(data as Row) : null;
    },

    async countActiveByOrganization(organization) {
      const { count, error } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("organization", organization)
        .in("status", ["pending", "approved", "checked_in"]);
      if (error) fail(error);
      return count ?? 0;
    },

    async createBooking(booking) {
      const result = await rpc<{ ok: boolean; error?: string; booking?: Row }>("create_booking", {
        p_booking: {
          id: booking.id,
          code: booking.code,
          room_id: booking.roomId,
          user_id: booking.userId,
          organization: booking.organization,
          event_name: booking.eventName,
          purpose: booking.purpose,
          attendees: booking.attendees,
          start_at: booking.startAt,
          end_at: booking.endAt,
        },
      });
      if (!result?.ok || !result.booking) {
        return { ok: false, error: result?.error ?? "Pengajuan gagal disimpan." } as Result<Booking>;
      }
      return { ok: true, value: mapBooking(result.booking) };
    },

    async approveBooking(bookingId, adminId) {
      const result = await rpc<{ ok: boolean; error?: string; booking?: Row; ticket?: Row }>("approve_booking", {
        p_booking_id: bookingId,
        p_admin_id: adminId,
      });
      if (!result?.ok || !result.booking || !result.ticket) {
        return { ok: false, error: result?.error ?? "Persetujuan gagal." } as Result<{
          booking: Booking;
          ticket: Ticket;
        }>;
      }
      return { ok: true, value: { booking: mapBooking(result.booking), ticket: mapTicket(result.ticket) } };
    },

    async rejectBooking(bookingId, adminId, reason) {
      const result = await rpc<{ ok: boolean; error?: string; booking?: Row }>("reject_booking", {
        p_booking_id: bookingId,
        p_admin_id: adminId,
        p_reason: reason,
      });
      if (!result?.ok || !result.booking) {
        return { ok: false, error: result?.error ?? "Penolakan gagal." } as Result<Booking>;
      }
      return { ok: true, value: mapBooking(result.booking) };
    },

    async cancelBooking(bookingId, userId, reason) {
      const result = await rpc<{ ok: boolean; error?: string; booking?: Row }>("cancel_booking", {
        p_booking_id: bookingId,
        p_user_id: userId,
        p_reason: reason,
      });
      if (!result?.ok || !result.booking) {
        return { ok: false, error: result?.error ?? "Pembatalan gagal." } as Result<Booking>;
      }
      return { ok: true, value: mapBooking(result.booking) };
    },

    async checkInByCode(code, officerId) {
      const result = await rpc<{ ok: boolean; error?: string; booking?: Row; ticket?: Row }>("check_in_ticket", {
        p_code: code,
        p_officer_id: officerId,
      });
      if (!result?.ok || !result.booking || !result.ticket) {
        return { ok: false, error: result?.error ?? "Check-in gagal." } as Result<CheckInResult>;
      }
      return { ok: true, value: { booking: mapBooking(result.booking), ticket: mapTicket(result.ticket) } };
    },

    async releaseNoShows() {
      const result = await rpc<Row[]>("release_no_shows", {});
      return (result ?? []).map(mapBooking);
    },

    async completeFinished() {
      const result = await rpc<Row[]>("complete_finished", {});
      return (result ?? []).map(mapBooking);
    },

    async updateBooking(id, patch) {
      const payload: Row = {};
      if (patch.status !== undefined) payload.status = patch.status;
      if (patch.rejectionReason !== undefined) payload.rejection_reason = patch.rejectionReason;
      if (patch.checkedInAt !== undefined) payload.checked_in_at = patch.checkedInAt;
      if (patch.cancelledAt !== undefined) payload.cancelled_at = patch.cancelledAt;
      if (patch.cancelReason !== undefined) payload.cancel_reason = patch.cancelReason;
      payload.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from("bookings").update(payload).eq("id", id).select("*").single();
      if (error) fail(error);
      return mapBooking(data as Row);
    },

    async getTicketByBooking(bookingId) {
      const { data, error } = await supabase
        .from("qr_tickets")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (error) fail(error);
      return data ? mapTicket(data as Row) : null;
    },

    async getTicketByCode(code) {
      const { data, error } = await supabase
        .from("qr_tickets")
        .select("*")
        .or(`code.ilike.${code},token.eq.${code}`)
        .maybeSingle();
      if (error) fail(error);
      return data ? mapTicket(data as Row) : null;
    },

    async saveTicket(ticket) {
      const { data, error } = await supabase
        .from("qr_tickets")
        .upsert({
          id: ticket.id,
          booking_id: ticket.bookingId,
          code: ticket.code,
          token: ticket.token,
          status: ticket.status,
          issued_at: ticket.issuedAt,
          expires_at: ticket.expiresAt,
          used_at: ticket.usedAt,
          used_by: ticket.usedBy,
        })
        .select("*")
        .single();
      if (error) fail(error);
      return mapTicket(data as Row);
    },

    async insertNotification(record) {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          id: record.id,
          booking_id: record.bookingId,
          recipient: record.recipient,
          subject: record.subject,
          body: record.body,
          status: record.status,
          driver: record.driver,
          sent_at: record.sentAt,
        })
        .select("*")
        .single();
      if (error) fail(error);
      return mapNotification(data as Row);
    },

    async listNotifications(limit = 50) {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) fail(error);
      return (data ?? []).map((row) => mapNotification(row as Row));
    },

    async insertAudit(log) {
      const { error } = await supabase.from("audit_logs").insert({
        id: log.id,
        actor_id: log.actorId,
        action: log.action,
        entity: log.entity,
        entity_id: log.entityId,
        meta: log.meta,
      });
      if (error) fail(error);
    },

    async listAudits(limit = 50) {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) fail(error);
      return (data ?? []).map((row) => ({
        id: str(row.id),
        actorId: nullableStr(row.actor_id),
        action: str(row.action),
        entity: str(row.entity),
        entityId: nullableStr(row.entity_id),
        meta: (row.meta as Record<string, unknown> | null) ?? null,
        createdAt: str(row.created_at),
      }));
    },
  };
}
