import { CheckCircle2, Clock, Info, ScanLine, ShieldAlert, ShieldCheck } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { RULES } from "@/lib/rules";
import { getOfficerView } from "@/lib/services/queries";
import { witaLongDate, witaTimeRange } from "@/lib/time";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Stat } from "@/components/ui/page-header";
import { CheckInForm, type ExpectedTicket } from "@/components/booking/check-in-form";

export const metadata = { title: "Check-In Gedung" };

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const user = await requireUser(["SATPAM", "ADMIN"]);
  const { code } = await searchParams;
  const view = await getOfficerView();

  const expected: ExpectedTicket[] = view.expected
    .filter((booking) => booking.ticket && booking.ticket.status === "issued")
    .map((booking) => ({
      code: booking.ticket!.code,
      bookingCode: booking.code,
      eventName: booking.eventName,
      room: `${booking.room.code} · ${booking.room.name}`,
      time: `${witaTimeRange(booking.startAt, booking.endAt)} WITA`,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${witaLongDate(view.dateKey)} · WITA`}
        title="Check-in tiket gedung"
        description="Verifikasi tiket QR pemohon saat tiba. Sistem menolak tiket yang belum disetujui, sudah dipakai, atau di luar jendela waktu."
        actions={<Badge tone="brand">{user.organization ?? "Petugas Gedung"}</Badge>}
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Diharapkan" value={view.expected.length} hint="Disetujui, belum check-in" tone="brand" icon={<Clock aria-hidden className="h-4 w-4" />} />
        <Stat label="Sudah check-in" value={view.checkedIn.length} hint="Termasuk sesi selesai" tone="free" icon={<CheckCircle2 aria-hidden className="h-4 w-4" />} />
        <Stat label="No-show" value={view.missed.length} hint="Slot dilepas otomatis" tone={view.missed.length ? "busy" : "default"} icon={<ShieldAlert aria-hidden className="h-4 w-4" />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <CheckInForm defaultCode={code} expected={expected} />
        </section>

        <aside className="space-y-4">
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <ShieldCheck aria-hidden className="h-4 w-4 text-free" /> Sudah check-in
            </h2>
            <div className="space-y-2">
              {view.checkedIn.map((booking) => (
                <article key={booking.id} className="rounded-xl border border-line bg-surface px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12.5px] font-medium">{booking.eventName}</p>
                    <Badge tone="free">Check-In</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {booking.room.code} · {witaTimeRange(booking.startAt, booking.endAt)} WITA · {booking.user.fullName}
                  </p>
                </article>
              ))}
              {view.checkedIn.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-[11.5px] text-muted">
                  Belum ada check-in hari ini.
                </p>
              ) : null}
            </div>
          </section>

          <Alert tone="info" title="Aturan check-in">
            <ul className="space-y-1">
              <li>• Check-in dibuka {RULES.checkInOpenMinutesBefore} menit sebelum jam mulai.</li>
              <li>• Lewat {RULES.noShowGraceMinutes} menit dari jam mulai, slot dilepas otomatis dan tiket dicabut.</li>
              <li>• Tiket hanya berlaku pada tanggal pemakaian yang tertera.</li>
              <li>• Jika QR tidak terbaca, gunakan kode tiket atau nomor pengajuan pada tiket.</li>
            </ul>
          </Alert>

          <div className="rounded-xl border border-dashed border-line p-4 text-[11.5px] leading-relaxed text-muted">
            <p className="flex items-center gap-1.5 font-semibold text-ink">
              <Info aria-hidden className="h-3.5 w-3.5" /> Catatan petugas
            </p>
            <p className="mt-1">
              Pastikan nama kegiatan dan ruangan sesuai dengan tiket sebelum mengizinkan pemakaian. Untuk kegunaan di luar
              jadwal, arahkan pemohon ke Sarpras.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-brand">
              <ScanLine aria-hidden className="h-3.5 w-3.5" /> Menu ini juga dapat diakses admin Sarpras.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
