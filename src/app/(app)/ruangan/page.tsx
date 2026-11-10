import Link from "next/link";
import { DoorOpen, Filter, Search, SlidersHorizontal } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { CATEGORY_LABEL, type RoomCategory } from "@/types";
import { ROOM_CATEGORIES } from "@/lib/rules";
import { buildRoomAvailability, dayRange } from "@/lib/services/queries";
import { getRepository } from "@/lib/db";
import { witaTodayKey } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { DateStrip } from "@/components/booking/date-strip";
import { RoomCard } from "@/components/room/room-card";

export const metadata = { title: "Katalog Ruangan" };

const CAPACITY_OPTIONS = [
  { value: "", label: "Semua kapasitas" },
  { value: "20", label: "Min. 20 orang" },
  { value: "30", label: "Min. 30 orang" },
  { value: "40", label: "Min. 40 orang" },
  { value: "100", label: "Min. 100 orang" },
];

const FACILITY_FILTERS = ["AC", "Proyektor", "Komputer", "Sound System"];

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const params = await searchParams;
  const dateKey = typeof params.tanggal === "string" ? params.tanggal : witaTodayKey();
  const category = typeof params.kategori === "string" ? (params.kategori as RoomCategory) : "";
  const minCapacity = typeof params.kapasitas === "string" ? Number(params.kapasitas) : 0;
  const facilities = typeof params.fasilitas === "string" ? params.fasilitas.split(",").filter(Boolean) : [];
  const query = typeof params.q === "string" ? params.q.toLowerCase() : "";

  const repo = getRepository();
  const [allRooms, bookings] = await Promise.all([
    repo.listRooms(),
    repo.listBookings({ ...dayRange(dateKey), statuses: ["pending", "approved", "checked_in"] }),
  ]);

  const filtered = allRooms.filter((room) => {
    if (category && room.category !== category) return false;
    if (minCapacity && room.capacity < minCapacity) return false;
    if (facilities.length && !facilities.every((facility) => room.facilities.includes(facility))) return false;
    if (query && !`${room.name} ${room.code} ${room.building}`.toLowerCase().includes(query)) return false;
    return true;
  });

  const grid = buildRoomAvailability(filtered, bookings, dateKey);

  function hrefWith(overrides: Record<string, string | undefined>) {
    const search = new URLSearchParams();
    const base: Record<string, string> = {
      tanggal: dateKey,
      ...(category ? { kategori: category } : {}),
      ...(minCapacity ? { kapasitas: String(minCapacity) } : {}),
      ...(facilities.length ? { fasilitas: facilities.join(",") } : {}),
      ...(query ? { q: query } : {}),
      ...overrides,
    };
    for (const [key, value] of Object.entries(base)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return `/ruangan${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Katalog"
        title="Cari ruangan yang tepat"
        description="Filter berdasarkan jenis, kapasitas, dan fasilitas. Warna sel jadwal menunjukkan ketersediaan pada tanggal terpilih."
        actions={
          <ButtonLink href={hrefWith({ tanggal: dateKey })} variant="outline">
            <SlidersHorizontal aria-hidden className="h-4 w-4" /> Cek kalender
          </ButtonLink>
        }
      />

      <DateStrip dateKey={dateKey} hrefBase="/ruangan" />

      <form className="surface-flat space-y-3 p-3.5" method="get">
        <input type="hidden" name="tanggal" value={dateKey} />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative">
            <span className="sr-only">Cari ruangan</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Cari nama atau gedung"
              className="h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-muted/70 focus:border-brand/40 focus:outline-none focus:ring-4 focus:ring-brand/10"
            />
          </label>

          <label>
            <span className="sr-only">Kategori ruangan</span>
            <select
              name="kategori"
              defaultValue={category}
              className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm focus:border-brand/40 focus:outline-none focus:ring-4 focus:ring-brand/10"
            >
              <option value="">Semua jenis ruangan</option>
              {ROOM_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {CATEGORY_LABEL[item]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Kapasitas minimum</span>
            <select
              name="kapasitas"
              defaultValue={minCapacity ? String(minCapacity) : ""}
              className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm focus:border-brand/40 focus:outline-none focus:ring-4 focus:ring-brand/10"
            >
              {CAPACITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <Button type="submit" variant="secondary">
            <Filter aria-hidden className="h-4 w-4" /> Terapkan filter
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-medium text-muted">Fasilitas:</span>
          {FACILITY_FILTERS.map((facility) => {
            const active = facilities.includes(facility);
            const next = active ? facilities.filter((item) => item !== facility) : [...facilities, facility];
            return (
              <Link
                key={facility}
                href={hrefWith({ fasilitas: next.length ? next.join(",") : undefined })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  active ? "border-brand bg-brand text-brand-fg" : "border-line bg-surface text-muted hover:border-brand/30 hover:text-ink",
                )}
              >
                {facility}
              </Link>
            );
          })}
          {(category || minCapacity || facilities.length || query) && (
            <Link href={`/ruangan?tanggal=${dateKey}`} className="ml-1 text-[11px] font-semibold text-brand hover:underline">
              Reset
            </Link>
          )}
        </div>
      </form>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-muted">
          <span className="font-semibold text-ink">{filtered.length}</span> ruangan ditemukan ·{" "}
          {grid.reduce((total, entry) => total + entry.slots.filter((slot) => slot.status === "free").length, 0)} slot kosong
        </p>
        <Badge tone="outline">{dateKey}</Badge>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<DoorOpen className="h-6 w-6" />}
          title="Tidak ada ruangan yang cocok"
          description="Coba longgarkan filter kapasitas atau fasilitas, lalu terapkan kembali."
          action={
            <ButtonLink href={`/ruangan?tanggal=${dateKey}`} size="sm" variant="outline">
              Reset filter
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((room) => {
            const entry = grid.find((item) => item.room.id === room.id);
            const freeSlots = entry?.slots.filter((slot) => slot.status === "free").length ?? 0;
            return (
              <RoomCard
                key={room.id}
                room={room}
                footer={
                  <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", freeSlots > 0 ? "text-free" : "text-muted")}>
                    <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", freeSlots > 0 ? "bg-free" : "bg-muted/50")} />
                    {freeSlots > 0 ? `${freeSlots} slot kosong` : "Penuh pada tanggal ini"}
                  </span>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
