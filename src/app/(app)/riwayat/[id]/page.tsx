import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Clock, MapPin, QrCode, UserRound, XCircle } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { canCancel } from "@/lib/rules";
import { getBookingDetail } from "@/lib/services/queries";
import { formatDateTimeWita, formatFullDateTimeWita, relativeTimeWita, witaTime } from "@/lib/time";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/booking/status-badge";
import { TicketCard } from "@/components/booking/ticket-card";
import { CancelBookingButton } from "@/components/booking/cancel-booking-button";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const booking = await getBookingDetail(id);

  if (!booking) notFound();
  const isOwner = booking.userId === user.id;
  const isStaff = user.role === "ADMIN" || user.role === "SATPAM";
  if (!isOwner && !isStaff) notFound();

  const timeline = [
    { label: "Pengajuan dibuat", at: booking.createdAt, done: true },
    {
      label: booking.status === "rejected" ? "Ditolak admin" : "Keputusan admin",
      at: booking.decidedAt,
      done: Boolean(booking.decidedAt),
    },
    { label: "Check-in di gedung", at: booking.checkedInAt, done: Boolean(booking.checkedInAt) },
    { label: "Pembatalan", at: booking.cancelledAt, done: Boolean(booking.cancelledAt) },
  ].filter((step) => step.done);

  return (
    <div className="space-y-5">
      <Link
        href={isStaff && !isOwner ? "/admin" : "/riwayat"}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" /> {isStaff && !isOwner ? "Kembali ke antrean" : "Kembali ke riwayat"}
      </Link>

      <PageHeader
        eyebrow={`${booking.code} · ${booking.room.code}`}
        title={booking.eventName}
        description={`${booking.room.name} · ${booking.room.building}, lantai ${booking.room.floor}`}
        actions={
          <>
            <StatusBadge status={booking.status} />
            {isOwner && canCancel(booking) ? (
              <CancelBookingButton bookingId={booking.id} bookingCode={booking.code} size="md" />
            ) : null}
          </>
        }
      />

      {booking.status === "rejected" && booking.rejectionReason ? (
        <Alert tone="error" title="Pengajuan ditolak">
          {booking.rejectionReason}
        </Alert>
      ) : null}

      {booking.status === "no_show" ? (
        <Alert tone="warning" title="Slot dilepas karena no-show">
          Pemohon tidak melakukan check-in dalam 30 menit setelah jam mulai. Slot dibuka kembali untuk sivitas lain dan
          catatan no-show ditambahkan ke akun.
        </Alert>
      ) : null}

      {booking.status === "pending" ? (
        <Alert tone="info" title="Menunggu keputusan Sarpras">
          Target tanggapan adalah ≤ 4 jam kerja. Anda akan menerima notifikasi email begitu status berubah.
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <div className="surface divide-y divide-line">
            <dl className="grid grid-cols-2 gap-4 p-4 sm:p-5">
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-muted">Tanggal</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-[13px] font-medium">
                  <CalendarDays aria-hidden className="h-3.5 w-3.5 text-muted" /> {formatFullDateTimeWita(booking.startAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-muted">Jam</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-[13px] font-medium">
                  <Clock aria-hidden className="h-3.5 w-3.5 text-muted" /> {witaTime(booking.startAt)}–{witaTime(booking.endAt)} WITA
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-muted">Peserta</dt>
                <dd className="mt-0.5 text-[13px] font-medium">{booking.attendees} orang</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-muted">Pemohon</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-[13px] font-medium">
                  <UserRound aria-hidden className="h-3.5 w-3.5 text-muted" /> {booking.user.fullName}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] uppercase tracking-wide text-muted">Organisasi / unit</dt>
                <dd className="mt-0.5 text-[13px] font-medium">{booking.organization ?? booking.user.email}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] uppercase tracking-wide text-muted">Keperluan</dt>
                <dd className="mt-0.5 whitespace-pre-line text-[13px] leading-relaxed">{booking.purpose}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 p-4 text-[11.5px] text-muted sm:px-5">
              <span className="inline-flex items-center gap-1.5">
                <MapPin aria-hidden className="h-3.5 w-3.5" /> {booking.room.facilities.join(" · ")}
              </span>
              <span>Diajukan {relativeTimeWita(booking.createdAt)}</span>
            </div>
          </div>

          <div className="surface p-4 sm:p-5">
            <h2 className="mb-3 text-[13px] font-semibold">Riwayat status</h2>
            <ol className="space-y-3">
              {timeline.map((step, index) => (
                <li key={`${step.label}-${index}`} className="flex gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                    <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-medium leading-tight">{step.label}</p>
                    <p className="text-[11px] text-muted">{formatDateTimeWita(step.at)}</p>
                  </div>
                </li>
              ))}
              {booking.cancelReason ? (
                <li className="flex gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-busy-soft text-busy">
                    <XCircle aria-hidden className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-medium leading-tight">Alasan pembatalan</p>
                    <p className="text-[11px] text-muted">{booking.cancelReason}</p>
                  </div>
                </li>
              ) : null}
            </ol>
          </div>
        </div>

        <div className="space-y-4">
          {booking.ticket ? (
            <TicketCard
              ticket={{
                code: booking.ticket.code,
                bookingCode: booking.code,
                eventName: booking.eventName,
                roomName: booking.room.name,
                roomCode: booking.room.code,
                startAt: booking.startAt,
                endAt: booking.endAt,
                status: booking.ticket.status,
                checkedInAt: booking.checkedInAt ?? booking.ticket.usedAt,
              }}
            />
          ) : booking.status === "pending" ? (
            <div className="rounded-2xl border border-dashed border-line p-5 text-center">
              <QrCode aria-hidden className="mx-auto h-7 w-7 text-muted/60" />
              <p className="mt-2 text-[13px] font-semibold">Tiket QR belum terbit</p>
              <p className="mx-auto mt-1 max-w-xs text-[11.5px] leading-relaxed text-muted">
                Tiket digital diterbitkan otomatis begitu admin Sarpras menyetujui pengajuan.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-5 text-center">
              <AlertTriangle aria-hidden className="mx-auto h-7 w-7 text-muted/60" />
              <p className="mt-2 text-[13px] font-semibold">Tidak ada tiket aktif</p>
              <p className="mx-auto mt-1 max-w-xs text-[11.5px] leading-relaxed text-muted">
                Pengajuan ini berstatus {booking.status}. Tiket hanya berlaku untuk pengajuan yang disetujui.
              </p>
            </div>
          )}

          <div className="surface-flat p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Kontak</p>
            <p className="mt-1 text-[12.5px] leading-relaxed">
              Sarana Prasarana · Gedung A lantai 1
              <br />
              <span className="text-muted">sarpras@idb.ac.id · 0361 000 000</span>
            </p>
          </div>

          {isStaff ? (
            <div className="no-print flex flex-wrap gap-2">
              <ButtonLink href="/admin" variant="outline" size="sm">
                Antrean persetujuan
              </ButtonLink>
              {booking.ticket ? (
                <ButtonLink href={`/checkin?code=${booking.ticket.code}`} variant="ghost" size="sm">
                  Buka pemindai
                </ButtonLink>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
