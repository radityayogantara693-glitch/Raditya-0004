export type Role = "MAHASISWA" | "DOSEN" | "ADMIN" | "SATPAM";

export type RoomCategory =
  | "STUDIO_DESAIN"
  | "LAB_KOMPUTER"
  | "RUANG_KELAS"
  | "AULA"
  | "GALERI";

export type BookingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export type TicketStatus = "issued" | "used" | "revoked" | "expired";

export interface User {
  id: string;
  ssoId: string;
  email: string;
  fullName: string;
  role: Role;
  organization: string | null;
  isActive: boolean;
  noShowStrikes: number;
  suspendedUntil: string | null;
  createdAt: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  category: RoomCategory;
  building: string;
  floor: number;
  capacity: number;
  facilities: string[];
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface Booking {
  id: string;
  code: string;
  roomId: string;
  userId: string;
  organization: string | null;
  eventName: string;
  purpose: string;
  attendees: number;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  rejectionReason: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  checkedInAt: string | null;
  checkedInBy: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  bookingId: string;
  code: string;
  token: string;
  status: TicketStatus;
  issuedAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedBy: string | null;
}

export interface NotificationRecord {
  id: string;
  bookingId: string | null;
  recipient: string;
  subject: string;
  body: string;
  status: "queued" | "sent" | "failed";
  driver: string;
  createdAt: string;
  sentAt: string | null;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface BookingDetail extends Booking {
  room: Room;
  user: User;
  ticket: Ticket | null;
}

export interface RoomAvailability {
  room: Room;
  slots: Array<{
    hour: number;
    status: "free" | "pending" | "busy" | "closed";
    booking?: Pick<Booking, "id" | "code" | "eventName" | "status" | "startAt" | "endAt">;
  }>;
}

export const ROLE_LABEL: Record<Role, string> = {
  MAHASISWA: "Mahasiswa / UKM",
  DOSEN: "Dosen",
  ADMIN: "Admin Sarpras",
  SATPAM: "Petugas Gedung",
};

export const CATEGORY_LABEL: Record<RoomCategory, string> = {
  STUDIO_DESAIN: "Studio Desain",
  LAB_KOMPUTER: "Lab Komputer",
  RUANG_KELAS: "Ruang Kelas",
  AULA: "Aula",
  GALERI: "Galeri",
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Menunggu Persetujuan",
  approved: "Disetujui",
  rejected: "Ditolak",
  checked_in: "Check-In",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  no_show: "No-Show",
};

export const ACTIVE_STATUSES: BookingStatus[] = ["pending", "approved", "checked_in"];
export const BLOCKING_STATUSES: BookingStatus[] = ["pending", "approved", "checked_in"];
