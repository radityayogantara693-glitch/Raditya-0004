import "server-only";

import type {
  Booking,
  BookingDetail,
  BookingStatus,
  Room,
  RoomAvailability,
  User,
} from "@/types";
import { getRepository } from "@/lib/db";
import { RULES } from "@/lib/rules";
import {
  OPERATING_END_HOUR,
  OPERATING_START_HOUR,
  addDaysToKey,
  witaDateKey,
  witaToInstant,
} from "@/lib/time";

const BLOCKING: BookingStatus[] = ["pending", "approved", "checked_in"];

export async function hydrateBookings(bookings: Booking[]): Promise<BookingDetail[]> {
  const repo = getRepository();
  const [rooms, users] = await Promise.all([repo.listRooms({ includeInactive: true }), repo.listUsers()]);
  const roomMap = new Map(rooms.map((room) => [room.id, room]));
  const userMap = new Map(users.map((user) => [user.id, user]));
  const tickets = await Promise.all(bookings.map((booking) => repo.getTicketByBooking(booking.id)));

  return bookings.map((booking, index) => ({
    ...booking,
    room:
      roomMap.get(booking.roomId) ??
      ({
        id: booking.roomId,
        code: "—",
        name: "Ruangan dihapus",
        category: "RUANG_KELAS",
        building: "—",
        floor: 0,
        capacity: 0,
        facilities: [],
        description: "",
        isActive: false,
        createdAt: booking.createdAt,
      } satisfies Room),
    user:
      userMap.get(booking.userId) ??
      ({
        id: booking.userId,
        ssoId: "—",
        email: "—",
        fullName: "Pengguna tidak dikenal",
        role: "MAHASISWA",
        organization: null,
        isActive: false,
        noShowStrikes: 0,
        suspendedUntil: null,
        createdAt: booking.createdAt,
      } satisfies User),
    ticket: tickets[index] ?? null,
  }));
}

export function dayRange(dateKey: string): { from: string; to: string } {
  return {
    from: witaToInstant(dateKey, "00:00").toISOString(),
    to: witaToInstant(addDaysToKey(dateKey, 1), "00:00").toISOString(),
  };
}

export function currentWitaHour(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Makassar",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
}

export function buildRoomAvailability(
  rooms: Room[],
  bookings: Booking[],
  dateKey: string,
  now = new Date(),
): RoomAvailability[] {
  const isToday = dateKey === witaDateKey(now);
  const currentHour = currentWitaHour(now);

  return rooms.map((room) => {
    const slots: RoomAvailability["slots"] = [];

    for (let hour = OPERATING_START_HOUR; hour < OPERATING_END_HOUR; hour += 1) {
      const slotStart = witaToInstant(dateKey, `${String(hour).padStart(2, "0")}:00`);
      const slotEnd = witaToInstant(dateKey, `${String(hour + 1).padStart(2, "0")}:00`);

      const booking = bookings.find(
        (item) =>
          item.roomId === room.id &&
          BLOCKING.includes(item.status) &&
          new Date(item.startAt) < slotEnd &&
          slotStart < new Date(item.endAt),
      );

      let status: RoomAvailability["slots"][number]["status"] = "free";
      if (!room.isActive) status = "closed";
      else if (booking) status = booking.status === "pending" ? "pending" : "busy";
      else if (isToday && hour < currentHour) status = "closed";

      slots.push({
        hour,
        status,
        booking: booking
          ? {
              id: booking.id,
              code: booking.code,
              eventName: booking.eventName,
              status: booking.status,
              startAt: booking.startAt,
              endAt: booking.endAt,
            }
          : undefined,
      });
    }

    return { room, slots };
  });
}

export async function getAvailability(dateKey: string): Promise<{
  dateKey: string;
  rooms: Room[];
  bookings: Booking[];
  grid: RoomAvailability[];
}> {
  const repo = getRepository();
  const range = dayRange(dateKey);
  const [rooms, bookings] = await Promise.all([
    repo.listRooms(),
    repo.listBookings({ from: range.from, to: range.to, statuses: BLOCKING }),
  ]);

  return { dateKey, rooms, bookings, grid: buildRoomAvailability(rooms, bookings, dateKey) };
}

export interface UserDashboard {
  upcoming: BookingDetail[];
  activeCount: number;
  pendingCount: number;
  nextBooking: BookingDetail | null;
  quotaLimit: number | null;
  quotaUsed: number | null;
  rooms: Room[];
  availableToday: number;
  history: BookingDetail[];
}

export async function getUserDashboard(user: User): Promise<UserDashboard> {
  const repo = getRepository();
  const today = witaDateKey();
  const range = dayRange(today);

  const [bookings, rooms, todayBookings] = await Promise.all([
    repo.listBookings({ userId: user.id }),
    repo.listRooms(),
    repo.listBookings({ from: range.from, to: range.to, statuses: BLOCKING }),
  ]);

  const details = await hydrateBookings(bookings);
  const now = Date.now();
  const upcoming = details
    .filter((booking) => ["pending", "approved", "checked_in"].includes(booking.status) && new Date(booking.endAt).getTime() > now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const activeCount = details.filter((booking) => ["pending", "approved", "checked_in"].includes(booking.status) && new Date(booking.endAt).getTime() > now).length;
  const pendingCount = details.filter((booking) => booking.status === "pending").length;

  const busyRoomIds = new Set(todayBookings.map((booking) => booking.roomId));
  const availableToday = rooms.filter((room) => !busyRoomIds.has(room.id)).length;

  const quotaLimit = user.role === "MAHASISWA" && user.organization ? RULES.maxActivePerOrganization : null;

  return {
    upcoming,
    activeCount,
    pendingCount,
    nextBooking: upcoming[0] ?? null,
    quotaLimit,
    quotaUsed: quotaLimit ? activeCount : null,
    rooms,
    availableToday,
    history: details.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
  };
}

export interface AdminOverview {
  pending: BookingDetail[];
  today: BookingDetail[];
  recent: BookingDetail[];
  stats: {
    pendingCount: number;
    todayCount: number;
    activeRooms: number;
    avgResponseHours: number | null;
    noShowRate: number;
    approvedThisMonth: number;
  };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const repo = getRepository();
  const today = witaDateKey();
  const range = dayRange(today);

  const [all, pendingRaw, todayRaw, rooms] = await Promise.all([
    repo.listBookings({ limit: 300 }),
    repo.listBookings({ statuses: ["pending"] }),
    repo.listBookings({ from: range.from, to: range.to, statuses: ["approved", "checked_in", "completed"] }),
    repo.listRooms(),
  ]);

  const [pending, todayDetails, recent] = await Promise.all([
    hydrateBookings(pendingRaw),
    hydrateBookings(todayRaw),
    hydrateBookings(all.slice(0, 12)),
  ]);

  const decided = all.filter((booking) => booking.decidedAt && booking.status !== "pending");
  const avgResponse =
    decided.length === 0
      ? null
      : decided.reduce((total, booking) => {
          return total + (new Date(booking.decidedAt!).getTime() - new Date(booking.createdAt).getTime()) / 3_600_000;
        }, 0) / decided.length;

  const finished = all.filter((booking) => ["completed", "no_show"].includes(booking.status));
  const noShowRate = finished.length === 0 ? 0 : (finished.filter((booking) => booking.status === "no_show").length / finished.length) * 100;

  const monthPrefix = today.slice(0, 7);
  const approvedThisMonth = all.filter(
    (booking) => booking.status !== "pending" && booking.status !== "rejected" && witaDateKey(booking.startAt).startsWith(monthPrefix),
  ).length;

  return {
    pending: pending.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    today: todayDetails.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    recent,
    stats: {
      pendingCount: pending.length,
      todayCount: todayDetails.length,
      activeRooms: rooms.length,
      avgResponseHours: avgResponse,
      noShowRate,
      approvedThisMonth,
    },
  };
}

export interface MonthlyReport {
  monthKey: string;
  totalBookings: number;
  perRoom: Array<{ room: Room; bookings: number; hours: number; utilization: number }>;
  peakHours: Array<{ hour: number; count: number }>;
  statusCounts: Record<BookingStatus, number>;
  noShow: { count: number; rate: number };
  utilization: number;
}

export async function getMonthlyReport(monthKey: string): Promise<MonthlyReport> {
  const repo = getRepository();
  const [year, month] = monthKey.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, (month ?? 1) - 1, 1, -8, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month ?? 1, 1, -8, 0, 0));

  const [rows, rooms] = await Promise.all([
    repo.listBookings({ from: monthStart.toISOString(), to: monthEnd.toISOString() }),
    repo.listRooms(),
  ]);

  const statusCounts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    checked_in: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
  } satisfies Record<BookingStatus, number>;

  for (const booking of rows) statusCounts[booking.status] += 1;

  const daysInMonth = new Date(Date.UTC(year, month ?? 1, 0)).getUTCDate();
  const capacityHours = daysInMonth * (OPERATING_END_HOUR - OPERATING_START_HOUR);

  const perRoom = rooms.map((room) => {
    const roomBookings = rows.filter(
      (booking) => booking.roomId === room.id && ["approved", "checked_in", "completed"].includes(booking.status),
    );
    const hours = roomBookings.reduce(
      (total, booking) => total + (new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) / 3_600_000,
      0,
    );
    return {
      room,
      bookings: roomBookings.length,
      hours,
      utilization: capacityHours === 0 ? 0 : (hours / capacityHours) * 100,
    };
  });

  const peakMap = new Map<number, number>();
  for (const booking of rows) {
    if (!["approved", "checked_in", "completed"].includes(booking.status)) continue;
    const startHour = Number(
      new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Makassar", hour: "2-digit", hour12: false }).format(
        new Date(booking.startAt),
      ),
    );
    peakMap.set(startHour, (peakMap.get(startHour) ?? 0) + 1);
  }

  const peakHours = Array.from({ length: OPERATING_END_HOUR - OPERATING_START_HOUR }, (_, index) => {
    const hour = OPERATING_START_HOUR + index;
    return { hour, count: peakMap.get(hour) ?? 0 };
  });

  const finished = rows.filter((booking) => ["completed", "no_show"].includes(booking.status));
  const noShowCount = rows.filter((booking) => booking.status === "no_show").length;
  const totalHours = perRoom.reduce((total, item) => total + item.hours, 0);
  const totalCapacity = capacityHours * rooms.length;

  return {
    monthKey,
    totalBookings: rows.length,
    perRoom: perRoom.sort((a, b) => b.hours - a.hours),
    peakHours,
    statusCounts,
    noShow: {
      count: noShowCount,
      rate: finished.length === 0 ? 0 : (noShowCount / finished.length) * 100,
    },
    utilization: totalCapacity === 0 ? 0 : (totalHours / totalCapacity) * 100,
  };
}

export interface OfficerView {
  dateKey: string;
  expected: BookingDetail[];
  checkedIn: BookingDetail[];
  missed: BookingDetail[];
}

export async function getOfficerView(): Promise<OfficerView> {
  const repo = getRepository();
  const today = witaDateKey();
  const range = dayRange(today);

  const rows = await repo.listBookings({
    from: range.from,
    to: range.to,
    statuses: ["approved", "checked_in", "no_show", "completed"],
  });
  const details = await hydrateBookings(rows);

  return {
    dateKey: today,
    expected: details
      .filter((booking) => booking.status === "approved")
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    checkedIn: details
      .filter((booking) => ["checked_in", "completed"].includes(booking.status))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    missed: details.filter((booking) => booking.status === "no_show"),
  };
}

export async function getBookingDetail(id: string): Promise<BookingDetail | null> {
  const repo = getRepository();
  const booking = await repo.getBooking(id);
  if (!booking) return null;
  const [detail] = await hydrateBookings([booking]);
  return detail ?? null;
}

export async function getUserBookings(userId: string): Promise<BookingDetail[]> {
  const repo = getRepository();
  const rows = await repo.listBookings({ userId });
  const details = await hydrateBookings(rows);
  return details.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
}
