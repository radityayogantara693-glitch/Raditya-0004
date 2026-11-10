import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, DoorOpen, MapPin, PlusCircle, Users } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { CATEGORY_LABEL } from "@/types";
import { buildRoomAvailability, dayRange } from "@/lib/services/queries";
import { getRepository } from "@/lib/db";
import { witaTodayKey } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AvailabilityGrid } from "@/components/booking/availability-grid";
import { DateStrip } from "@/components/booking/date-strip";
import { BookingRow } from "@/components/booking/booking-row";

export default async function RoomDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tanggal?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { tanggal } = await searchParams;
  const dateKey = tanggal ?? witaTodayKey();

  const repo = getRepository();
  const room = await repo.getRoom(id);
  if (!room) notFound();

  const dayBookings = await repo.listBookings({
    roomId: room.id,
    ...dayRange(dateKey),
    statuses: ["pending", "approved", "checked_in", "completed"],
  });

  const grid = buildRoomAvailability([room], dayBookings, dateKey);
  const freeSlots = grid[0]?.slots.filter((slot) => slot.status === "free").length ?? 0;

  const users = await repo.listUsers();
  const schedule = dayBookings
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .map((booking) => ({
      booking,
      user: users.find((item) => item.id === booking.userId),
    }))
    .filter((entry): entry is { booking: (typeof dayBookings)[number]; user: (typeof users)[number] } => Boolean(entry.user));

  return (
    <div className="space-y-6">
      <Link href="/ruangan" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink">
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" /> Katalog ruangan
      </Link>

      <PageHeader
        eyebrow={`${room.code} · ${CATEGORY_LABEL[room.category]}`}
        title={room.name}
        description={room.description}
        actions={
          <>
            <ButtonLink href={`/ajukan?ruangan=${room.id}&tanggal=${dateKey}`} variant={room.isActive ? "primary" : "outline"}>
              <PlusCircle aria-hidden className="h-4 w-4" /> Ajukan peminjaman
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface-flat flex items-center gap-3 p-3.5">
          <MapPin aria-hidden className="h-4 w-4 text-brand" />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted">Lokasi</p>
            <p className="text-[13px] font-medium">
              {room.building}, lantai {room.floor}
            </p>
          </div>
        </div>
        <div className="surface-flat flex items-center gap-3 p-3.5">
          <Users aria-hidden className="h-4 w-4 text-brand" />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted">Kapasitas</p>
            <p className="text-[13px] font-medium">{room.capacity} orang</p>
          </div>
        </div>
        <div className="surface-flat flex items-center gap-3 p-3.5">
          <Building2 aria-hidden className="h-4 w-4 text-brand" />
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted">Status operasional</p>
            <p className="text-[13px] font-medium">{room.isActive ? "Aktif" : "Nonaktif"}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {room.facilities.map((facility) => (
          <Badge key={facility} tone="neutral">
            {facility}
          </Badge>
        ))}
        <Badge tone={freeSlots > 0 ? "free" : "busy"}>
          {freeSlots > 0 ? `${freeSlots} slot kosong` : "Penuh pada tanggal ini"}
        </Badge>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight">Ketersediaan</h2>
          <span className="text-[11px] text-muted">Klik sel hijau untuk mengisi formulir otomatis</span>
        </div>
        <DateStrip dateKey={dateKey} hrefBase={`/ruangan/${room.id}`} />
        <AvailabilityGrid grid={grid} dateKey={dateKey} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Jadwal pada tanggal ini</h2>
        <div className="space-y-2">
          {schedule.map(({ booking, user }) => (
            <BookingRow
              key={booking.id}
              booking={{
                ...booking,
                room,
                user,
                ticket: null,
              }}
              showOwner
            />
          ))}
          {schedule.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[12px] text-muted">
              Belum ada peminjaman pada tanggal ini.
            </p>
          ) : null}
        </div>
      </section>

      <p className="flex items-center gap-2 text-[11px] text-muted">
        <DoorOpen aria-hidden className="h-3.5 w-3.5" /> Jam operasional peminjaman {`07.00–21.00`} WITA.
      </p>
    </div>
  );
}
