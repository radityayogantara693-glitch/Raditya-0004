import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  DoorOpen,
  PlusCircle,
  ScanLine,
  Ticket,
} from "lucide-react";

import type { User } from "@/types";
import { requireUser } from "@/lib/auth/session";
import { RULES } from "@/lib/rules";
import { getAdminOverview, getAvailability, getUserDashboard, currentWitaHour, dayRange } from "@/lib/services/queries";
import { getRepository } from "@/lib/db";
import { formatDateTimeWita, witaLongDate, witaTime, witaTimeRange, witaTodayKey } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, PageHeader, Stat } from "@/components/ui/page-header";
import { BookingRow } from "@/components/booking/booking-row";
import { StatusBadge } from "@/components/booking/status-badge";
import { RoomCard } from "@/components/room/room-card";
import { ApproveButton } from "@/components/admin/approve-button";
import { RejectButton } from "@/components/admin/reject-button";
import { MaintenanceButton } from "@/components/admin/maintenance-button";

export const metadata = { title: "Beranda" };

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Makassar", hour: "2-digit", hour12: false }).format(new Date()),
  );
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function firstName(fullName: string): string {
  return fullName.split(" ")[0] ?? fullName;
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "SATPAM") redirect("/checkin");
  if (user.role === "ADMIN") return <AdminHome user={user} />;
  return <UserHome user={user} />;
}

async function UserHome({ user }: { user: User }) {
  const [data, availability] = await Promise.all([getUserDashboard(user), getAvailability(witaTodayKey())]);
  const next = data.nextBooking;

  const availableRooms = availability.grid
    .map((entry) => ({
      room: entry.room,
      freeSlots: entry.slots.filter((slot) => slot.status === "free").length,
    }))
    .filter((entry) => entry.freeSlots > 0)
    .slice(0, 3);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={`${witaLongDate(new Date())} · WITA`}
        title={`${greeting()}, ${firstName(user.fullName)}`}
        description={
          user.role === "DOSEN"
            ? "Ajukan ruang kelas pengganti atau lab untuk kegiatan akademik. Anda dapat memesan hingga 30 hari ke depan."
            : "Cek ketersediaan ruangan, ajukan peminjaman, dan tunjukkan tiket QR saat tiba di gedung."
        }
        actions={
          <ButtonLink href="/ajukan">
            <PlusCircle aria-hidden className="h-4 w-4" /> Ajukan peminjaman
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Pengajuan aktif"
          value={data.activeCount}
          hint={user.organization ?? "Tidak ada organisasi"}
          icon={<CalendarClock aria-hidden className="h-4 w-4" />}
          tone="brand"
        />
        <Stat
          label="Menunggu admin"
          value={data.pendingCount}
          hint={`Target tanggapan ${RULES.approvalTargetHours} jam kerja`}
          icon={<Clock aria-hidden className="h-4 w-4" />}
          tone={data.pendingCount > 0 ? "pending" : "default"}
        />
        <Stat
          label="Ruangan kosong hari ini"
          value={data.availableToday}
          hint={`dari ${data.rooms.length} ruangan aktif`}
          icon={<DoorOpen aria-hidden className="h-4 w-4" />}
          tone="free"
        />
        <Stat
          label="Kuota UKM"
          value={data.quotaLimit ? `${data.quotaUsed}/${data.quotaLimit}` : "—"}
          hint={
            data.quotaLimit
              ? "Maksimal 2 pengajuan aktif bersamaan"
              : user.role === "DOSEN"
                ? "Dosen tidak dibatasi kuota UKM"
                : "Bukan organisasi kemahasiswaan"
          }
          icon={<CalendarDays aria-hidden className="h-4 w-4" />}
        />
      </div>

      <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">Peminjaman berikutnya</h2>
            <Link href="/riwayat" className="text-[12px] font-semibold text-brand hover:underline">
              Lihat semua
            </Link>
          </div>

          {next ? (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/60 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <StatusBadge status={next.status} />
                  <span className="font-mono text-[11px] text-muted">{next.code}</span>
                </div>
                {next.ticket ? (
                  <Link
                    href={`/riwayat/${next.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                  >
                    <Ticket aria-hidden className="h-3.5 w-3.5" /> Tiket {next.ticket.code}
                  </Link>
                ) : (
                  <span className="text-[11px] text-muted">Tiket terbit setelah disetujui</span>
                )}
              </div>

              <CardContent className="space-y-3 p-4 sm:p-5">
                <div>
                  <h3 className="font-display text-xl font-semibold leading-tight">{next.eventName}</h3>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {next.room.name} ({next.room.code}) · {next.room.building}, lantai {next.room.floor}
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-[12.5px]">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-muted">Tanggal</dt>
                    <dd className="font-medium">{formatDateTimeWita(next.startAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-muted">Jam</dt>
                    <dd className="font-medium">{witaTimeRange(next.startAt, next.endAt)} WITA</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-muted">Peserta</dt>
                    <dd className="font-medium">{next.attendees} orang</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-muted">Fasilitas</dt>
                    <dd className="font-medium">{next.room.facilities.slice(0, 3).join(", ")}</dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-2 pt-1">
                  <ButtonLink href={`/riwayat/${next.id}`} size="sm" variant={next.ticket ? "primary" : "outline"}>
                    {next.ticket ? <ScanLine aria-hidden className="h-3.5 w-3.5" /> : null}
                    {next.ticket ? "Buka tiket QR" : "Lihat detail"}
                  </ButtonLink>
                  <ButtonLink href="/kalender" size="sm" variant="ghost">
                    Lihat kalender <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                  </ButtonLink>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5">
                <EmptyState
                  icon={<CalendarClock className="h-6 w-6" />}
                  title="Belum ada peminjaman aktif"
                  description="Mulai dari kalender ketersediaan atau langsung isi formulir pengajuan."
                  action={
                    <ButtonLink href="/ajukan" size="sm">
                      <PlusCircle aria-hidden className="h-3.5 w-3.5" /> Ajukan sekarang
                    </ButtonLink>
                  }
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">Ruangan tersedia hari ini</h2>
          <div className="space-y-2">
            {availableRooms.map(({ room, freeSlots }) => (
              <div key={room.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{room.name}</p>
                  <p className="truncate text-[11px] text-muted">
                    {room.code} · {freeSlots} slot kosong · {room.capacity} org
                  </p>
                </div>
                <ButtonLink href={`/ruangan/${room.id}`} size="sm" variant="outline" className="shrink-0">
                  Jadwal
                </ButtonLink>
              </div>
            ))}
            {availableRooms.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[12px] text-muted">
                Semua ruangan terpakai hari ini. Coba tanggal lain di kalender.
              </p>
            ) : null}
          </div>

          <div className="pt-2">
            <div className="surface-flat space-y-2 p-4">
              <p className="flex items-center gap-2 text-[13px] font-semibold">
                <CheckCircle2 aria-hidden className="h-4 w-4 text-brand" /> Alur 3 langkah
              </p>
              <ol className="space-y-1 text-[12px] leading-relaxed text-muted">
                <li>1. Cari ruang dan jam yang kosong.</li>
                <li>2. Isi formulir kegiatan dan estimasi peserta.</li>
                <li>3. Kirim — admin meninjau, tiket QR terbit otomatis.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Aktivitas terakhir</h2>
          <Link href="/riwayat" className="text-[12px] font-semibold text-brand hover:underline">
            Riwayat lengkap
          </Link>
        </div>
        <div className="space-y-2">
          {data.history.slice(0, 3).map((booking) => (
            <BookingRow key={booking.id} booking={booking} href={`/riwayat/${booking.id}`} />
          ))}
          {data.history.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[12px] text-muted">
              Belum ada riwayat pengajuan.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Ruangan yang sering dipakai</h2>
          <Link href="/ruangan" className="text-[12px] font-semibold text-brand hover:underline">
            Katalog ruangan
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.rooms.slice(0, 3).map((room) => (
            <RoomCard key={room.id} room={room} footer={<span className="text-[11px] text-muted">{room.capacity} orang</span>} />
          ))}
        </div>
      </section>
    </div>
  );
}

async function AdminHome({ user }: { user: User }) {
  const [overview, todayRaw] = await Promise.all([getAdminOverview(), getRepository().listBookings({ ...dayRange(witaTodayKey()), statuses: ["checked_in", "completed"] })]);
  const checkedInCount = todayRaw.length;
  const hour = currentWitaHour();
  const busiest = overview.today.length;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={`${witaLongDate(new Date())} · WITA`}
        title={`${greeting()}, ${firstName(user.fullName)}`}
        description="Ringkasan operasional peminjaman ruangan hari ini. Pengajuan baru menunggu keputusan Anda."
        actions={
          <>
            <MaintenanceButton />
            <ButtonLink href="/admin">
              Buka antrean <ArrowRight aria-hidden className="h-4 w-4" />
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Menunggu persetujuan"
          value={overview.stats.pendingCount}
          hint={`Target ${RULES.approvalTargetHours} jam kerja`}
          tone={overview.stats.pendingCount > 0 ? "pending" : "default"}
          icon={<Clock aria-hidden className="h-4 w-4" />}
        />
        <Stat
          label="Jadwal hari ini"
          value={overview.stats.todayCount}
          hint={`${checkedInCount} sudah check-in`}
          icon={<CalendarDays aria-hidden className="h-4 w-4" />}
          tone="brand"
        />
        <Stat
          label="Rata-rata tanggapan"
          value={overview.stats.avgResponseHours == null ? "—" : `${overview.stats.avgResponseHours.toFixed(1)} j`}
          hint={overview.stats.avgResponseHours != null && overview.stats.avgResponseHours <= RULES.approvalTargetHours ? "Memenuhi target KPI" : "Perlu perceptan"}
          tone={overview.stats.avgResponseHours != null && overview.stats.avgResponseHours <= RULES.approvalTargetHours ? "free" : "pending"}
          icon={<CalendarClock aria-hidden className="h-4 w-4" />}
        />
        <Stat
          label="No-show"
          value={`${overview.stats.noShowRate.toFixed(0)}%`}
          hint="Target ≤ 5% dari reservasi selesai"
          tone={overview.stats.noShowRate > 5 ? "busy" : "free"}
          icon={<ScanLine aria-hidden className="h-4 w-4" />}
        />
      </div>

      {hour >= RULES.operatingStartHour && hour < RULES.operatingEndHour ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[12px] text-muted">
          <Badge tone="brand">Jam operasional</Badge>
          <span>
            Sekarang {String(hour).padStart(2, "0")}.00 WITA · {busiest} kegiatan terjadwal hari ini · {overview.stats.activeRooms} ruangan aktif
          </span>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Perlu keputusan</h2>
          <Link href="/admin" className="text-[12px] font-semibold text-brand hover:underline">
            Semua pengajuan
          </Link>
        </div>

        <div className="space-y-2">
          {overview.pending.slice(0, 4).map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              href={`/riwayat/${booking.id}`}
              showOwner
              action={
                <div className="flex items-center gap-1.5">
                  <ApproveButton bookingId={booking.id} bookingCode={booking.code} />
                  <RejectButton bookingId={booking.id} bookingCode={booking.code} eventName={booking.eventName} />
                </div>
              }
            />
          ))}
          {overview.pending.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="Antrean bersih"
              description="Semua pengajuan sudah diproses. Pengajuan baru akan muncul di sini."
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Jadwal hari ini</h2>
        <div className="space-y-2">
          {overview.today.map((booking) => (
            <BookingRow key={booking.id} booking={booking} href={`/riwayat/${booking.id}`} showOwner />
          ))}
          {overview.today.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[12px] text-muted">
              Tidak ada kegiatan terjadwal hari ini.
            </p>
          ) : null}
        </div>
      </section>

      <p className="text-[11px] text-muted">
        {overview.stats.approvedThisMonth} pengajuan disetujui bulan ini ·{" "}
        {overview.recent[0] ? `aktivitas terakhir ${witaTime(overview.recent[0].updatedAt)} WITA` : "belum ada aktivitas"}
      </p>
    </div>
  );
}
