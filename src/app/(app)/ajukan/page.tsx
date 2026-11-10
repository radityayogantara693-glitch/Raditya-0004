import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { RULES, advanceWindowLabel } from "@/lib/rules";
import { getRepository } from "@/lib/db";
import { addDaysToKey, witaTodayKey } from "@/lib/time";
import { PageHeader } from "@/components/ui/page-header";
import { BookingForm, type RoomOption } from "@/components/booking/booking-form";

export const metadata = { title: "Ajukan Peminjaman" };

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ ruangan?: string; tanggal?: string; mulai?: string; selesai?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const repo = getRepository();
  const rooms = await repo.listRooms();
  if (rooms.length === 0) notFound();

  const today = witaTodayKey();
  const minDate = addDaysToKey(today, RULES.minAdvanceDays[user.role]);
  const maxDate = addDaysToKey(today, RULES.maxHorizonDays[user.role]);

  const requestedDate = params.tanggal && params.tanggal >= minDate && params.tanggal <= maxDate ? params.tanggal : null;
  const fallbackDate = addDaysToKey(today, Math.min(RULES.minAdvanceDays[user.role] + 1, RULES.maxHorizonDays[user.role]));
  const defaultDate = requestedDate ?? fallbackDate;

  const requestedRoom = params.ruangan && rooms.some((room) => room.id === params.ruangan) ? params.ruangan : rooms[0].id;

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  const startTime = params.mulai && timePattern.test(params.mulai) ? params.mulai : "09:00";
  const endTime = params.selesai && timePattern.test(params.selesai) ? params.selesai : "11:00";

  const activeCount = user.organization ? await repo.countActiveByOrganization(user.organization) : 0;

  const options: RoomOption[] = rooms.map((room) => ({
    id: room.id,
    code: room.code,
    name: room.name,
    capacity: room.capacity,
    category: room.category,
    building: room.building,
    floor: room.floor,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Formulir peminjaman"
        title="Ajukan peminjaman ruangan"
        description="Lengkapi detail kegiatan. Sistem akan memeriksa bentrok jadwal secara instan sebelum pengajuan diteruskan ke Sarpras."
      />

      <BookingForm
        rooms={options}
        defaults={{ roomId: requestedRoom, date: defaultDate, startTime, endTime }}
        minDate={minDate}
        maxDate={maxDate}
        windowLabel={advanceWindowLabel(user.role)}
        maxDurationHours={RULES.maxDurationHours[user.role]}
        userRole={user.role}
        organization={user.organization}
        quota={
          user.role === "MAHASISWA" && user.organization
            ? { used: activeCount, limit: RULES.maxActivePerOrganization }
            : null
        }
      />
    </div>
  );
}
