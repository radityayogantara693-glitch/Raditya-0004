import type {
  AuditLog,
  Booking,
  BookingStatus,
  NotificationRecord,
  Room,
  Ticket,
  User,
} from "@/types";

export interface BookingQuery {
  userId?: string;
  roomId?: string;
  statuses?: BookingStatus[];
  /** ISO, inklusif */
  from?: string;
  /** ISO, eksklusif */
  to?: string;
  limit?: number;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export interface CheckInResult {
  booking: Booking;
  ticket: Ticket;
}

export interface Repository {
  readonly driver: "local" | "supabase";

  // Users
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  listUsers(): Promise<User[]>;
  updateUser(id: string, patch: Partial<User>): Promise<User>;

  // Rooms
  listRooms(options?: { includeInactive?: boolean }): Promise<Room[]>;
  getRoom(id: string): Promise<Room | null>;
  getRoomByCode(code: string): Promise<Room | null>;
  createRoom(room: Room): Promise<Room>;
  updateRoom(id: string, patch: Partial<Room>): Promise<Room>;

  // Bookings
  listBookings(query?: BookingQuery): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;
  getBookingByCode(code: string): Promise<Booking | null>;
  countActiveByOrganization(organization: string): Promise<number>;
  createBooking(booking: Booking): Promise<Result<Booking>>;
  approveBooking(bookingId: string, adminId: string): Promise<Result<{ booking: Booking; ticket: Ticket }>>;
  rejectBooking(bookingId: string, adminId: string, reason: string): Promise<Result<Booking>>;
  cancelBooking(bookingId: string, userId: string, reason: string): Promise<Result<Booking>>;
  checkInByCode(code: string, officerId: string, now: Date): Promise<Result<CheckInResult>>;
  releaseNoShows(now: Date): Promise<Booking[]>;
  completeFinished(now: Date): Promise<Booking[]>;
  updateBooking(id: string, patch: Partial<Booking>): Promise<Booking>;

  // Tickets
  getTicketByBooking(bookingId: string): Promise<Ticket | null>;
  getTicketByCode(code: string): Promise<Ticket | null>;
  saveTicket(ticket: Ticket): Promise<Ticket>;

  // Notifikasi & audit
  insertNotification(record: NotificationRecord): Promise<NotificationRecord>;
  listNotifications(limit?: number): Promise<NotificationRecord[]>;
  insertAudit(log: AuditLog): Promise<void>;
  listAudits(limit?: number): Promise<AuditLog[]>;
}

export function conflictMessage(room: Room, booking: Booking): string {
  return `Slot ${room.name} sudah dipakai untuk "${booking.eventName}" pada jam tersebut.`;
}
