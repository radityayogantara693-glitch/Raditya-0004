import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { witaDateKey, witaTime, witaToInstant } from "@/lib/time";
import { STATUS_LABEL } from "@/types";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | null): string {
  const text = value == null ? "" : String(value);
  if (/[",\n;]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak berwenang." }, { status: 401 });
  }

  const monthKey = /^\d{4}-\d{2}$/.test(request.nextUrl.searchParams.get("bulan") ?? "")
    ? request.nextUrl.searchParams.get("bulan")!
    : witaDateKey().slice(0, 7);

  const [year, month] = monthKey.split("-").map(Number);
  const from = witaToInstant(`${year}-${String(month).padStart(2, "0")}-01`, "00:00").toISOString();
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const to = witaToInstant(nextMonth, "00:00").toISOString();

  const repo = getRepository();
  const [rows, rooms, users] = await Promise.all([
    repo.listBookings({ from, to }),
    repo.listRooms({ includeInactive: true }),
    repo.listUsers(),
  ]);

  const roomMap = new Map(rooms.map((room) => [room.id, room]));
  const userMap = new Map(users.map((item) => [item.id, item]));

  const header = [
    "Kode",
    "Tanggal",
    "Mulai",
    "Selesai",
    "Ruangan",
    "Gedung",
    "Kegiatan",
    "Pemohon",
    "Organisasi",
    "Peserta",
    "Status",
    "Check-in",
    "Alasan penolakan",
  ];

  const lines = [header.join(",")];
  for (const booking of rows) {
    const room = roomMap.get(booking.roomId);
    const owner = userMap.get(booking.userId);
    lines.push(
      [
        booking.code,
        witaDateKey(booking.startAt),
        witaTime(booking.startAt),
        witaTime(booking.endAt),
        room?.name ?? "-",
        room?.building ?? "-",
        booking.eventName,
        owner?.fullName ?? "-",
        booking.organization ?? "-",
        booking.attendees,
        STATUS_LABEL[booking.status],
        booking.checkedInAt ? `${witaDateKey(booking.checkedInAt)} ${witaTime(booking.checkedInAt)}` : "",
        booking.rejectionReason ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const body = `\uFEFF${lines.join("\r\n")}`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-ruangan-${monthKey}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: "GET" } });
}
