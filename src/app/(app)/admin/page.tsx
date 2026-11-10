import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, Clock, Inbox, Users } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { RULES } from "@/lib/rules";
import { getAdminOverview } from "@/lib/services/queries";
import { formatDateTimeWita, relativeTimeWita, witaLongDate, witaTime, witaTodayKey } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, Stat } from "@/components/ui/page-header";
import { BookingRow } from "@/components/booking/booking-row";
import { StatusBadge } from "@/components/booking/status-badge";
import { ApproveButton } from "@/components/admin/approve-button";
import { RejectButton } from "@/components/admin/reject-button";
import { MaintenanceButton } from "@/components/admin/maintenance-button";

export const metadata = { title: "Persetujuan Pengajuan" };

export default async function AdminQueuePage() {
  await requireUser(["ADMIN"]);
  const overview = await getAdminOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Sarpras"
        title="Antrean persetujuan"
        description={`Pantau pengajuan masuk, setujui untuk menerbitkan tiket QR, atau tolak dengan alasan yang jelas. Target tanggapan ${RULES.approvalTargetHours} jam kerja.`}
        actions={
          <>
            <MaintenanceButton compact />
            <ButtonLink href="/admin/ruangan" variant="outline">
              Kelola ruangan
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Menunggu" value={overview.stats.pendingCount} tone={overview.stats.pendingCount ? "pending" : "default"} hint="Pengajuan baru" />
        <Stat label="Hari ini" value={overview.stats.todayCount} hint={witaLongDate(witaTodayKey())} tone="brand" />
        <Stat
          label="Rata-rata tanggapan"
          value={overview.stats.avgResponseHours == null ? "—" : `${overview.stats.avgResponseHours.toFixed(1)} j`}
          hint="Target ≤ 4 jam"
          tone={overview.stats.avgResponseHours != null && overview.stats.avgResponseHours <= 4 ? "free" : "pending"}
        />
        <Stat
          label="No-show"
          value={`${overview.stats.noShowRate.toFixed(0)}%`}
          hint="Dari reservasi selesai"
          tone={overview.stats.noShowRate > 5 ? "busy" : "free"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">Menunggu keputusan</h2>
            <Badge tone="outline">{overview.pending.length} pengajuan</Badge>
          </div>

          {overview.pending.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="Tidak ada pengajuan menunggu"
              description="Antrean sudah bersih. Pengajuan baru akan muncul di sini secara otomatis."
            />
          ) : (
            <div className="space-y-3">
              {overview.pending.map((booking) => (
                <article key={booking.id} className="surface overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/60 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={booking.status} />
                      <span className="font-mono text-[11px] text-muted">{booking.code}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                      <Clock aria-hidden className="h-3 w-3" /> {relativeTimeWita(booking.createdAt)}
                    </span>
                  </div>

                  <div className="space-y-2.5 p-4">
                    <div>
                      <h3 className="text-[15px] font-semibold leading-snug">{booking.eventName}</h3>
                      <p className="text-[12px] text-muted">
                        {booking.room.name} ({booking.room.code}) · {booking.room.building} lt. {booking.room.floor}
                      </p>
                    </div>

                    <p className="line-clamp-2 text-[12px] leading-relaxed text-muted">{booking.purpose}</p>

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px] sm:grid-cols-3">
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-muted">Jadwal</dt>
                        <dd className="font-medium">{formatDateTimeWita(booking.startAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-muted">Durasi</dt>
                        <dd className="font-medium">
                          {witaTime(booking.startAt)}–{witaTime(booking.endAt)} WITA
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-muted">Peserta</dt>
                        <dd className="inline-flex items-center gap-1 font-medium">
                          <Users aria-hidden className="h-3 w-3 text-muted" /> {booking.attendees} / {booking.room.capacity}
                        </dd>
                      </div>
                    </dl>

                    <p className="text-[11.5px] text-muted">
                      Pemohon: <span className="font-medium text-ink">{booking.user.fullName}</span> ·{" "}
                      {booking.organization ?? booking.user.email}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                      <ApproveButton bookingId={booking.id} bookingCode={booking.code} />
                      <RejectButton bookingId={booking.id} bookingCode={booking.code} eventName={booking.eventName} />
                      <Link
                        href={`/riwayat/${booking.id}`}
                        className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand hover:underline"
                      >
                        Detail <ArrowRight aria-hidden className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <CalendarDays aria-hidden className="h-4 w-4 text-brand" /> Jadwal hari ini
            </h2>
            {overview.today.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[12px] text-muted">
                <Inbox aria-hidden className="mx-auto mb-1 h-5 w-5" />
                Tidak ada kegiatan terjadwal.
              </div>
            ) : (
              <div className="space-y-2">
                {overview.today.map((booking) => (
                  <BookingRow key={booking.id} booking={booking} href={`/riwayat/${booking.id}`} showOwner />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold tracking-tight">Keputusan terbaru</h2>
            <div className="space-y-2">
              {overview.recent
                .filter((booking) => booking.decidedAt)
                .slice(0, 5)
                .map((booking) => (
                  <div key={booking.id} className="rounded-xl border border-line bg-surface px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12px] font-medium">{booking.eventName}</p>
                      <StatusBadge status={booking.status} short className="shrink-0" />
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {booking.code} · {booking.user.fullName}
                    </p>
                  </div>
                ))}
              {overview.recent.filter((booking) => booking.decidedAt).length === 0 ? (
                <p className="text-[11.5px] text-muted">Belum ada keputusan.</p>
              ) : null}
            </div>
          </section>

          <div className="rounded-xl border border-dashed border-line p-4 text-[11.5px] leading-relaxed text-muted">
            <p className="flex items-center gap-1.5 font-semibold text-ink">
              <ClipboardCheck aria-hidden className="h-3.5 w-3.5" /> Kebijakan singkat
            </p>
            <ul className="mt-1.5 space-y-1">
              <li>• Setujui jika ruangan, waktu, dan keperluan sesuai.</li>
              <li>• Tiket QR terbit otomatis dan dikirim ke pemohon.</li>
              <li>• Tolak dengan alasan konkret agar pemohon dapat mengajukan ulang.</li>
              <li>• No-show dilepas otomatis setelah 30 menit dari jam mulai.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
