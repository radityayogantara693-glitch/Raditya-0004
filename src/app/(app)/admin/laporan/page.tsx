import { BarChart3, Download, TrendingUp } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { RULES } from "@/lib/rules";
import { getMonthlyReport } from "@/lib/services/queries";
import { STATUS_LABEL, type BookingStatus } from "@/types";
import { witaTodayKey } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader, Stat } from "@/components/ui/page-header";

export const metadata = { title: "Laporan Pemanfaatan" };

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const params = await searchParams;
  const monthKey = /^\d{4}-\d{2}$/.test(params.bulan ?? "") ? params.bulan! : witaTodayKey().slice(0, 7);
  const report = await getMonthlyReport(monthKey);

  const [year, month] = monthKey.split("-").map(Number);
  const label = `${MONTH_NAMES[(month ?? 1) - 1]} ${year}`;
  const maxPeak = Math.max(1, ...report.peakHours.map((item) => item.count));
  const topRoom = report.perRoom[0];
  const statusEntries = Object.entries(report.statusCounts) as Array<[BookingStatus, number]>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analitik"
        title="Laporan pemanfaatan"
        description={`Rekap pemakaian ruangan periode ${label}. Dasar evaluasi kapasitas dan kebijakan peminjaman.`}
        actions={
          <>
            <ButtonLink href={`/api/reports/export?bulan=${monthKey}`} variant="outline">
              <Download aria-hidden className="h-4 w-4" /> Unduh CSV
            </ButtonLink>
          </>
        }
      />

      <form method="get" className="surface-flat flex flex-wrap items-end gap-2 p-3.5">
        <label className="flex-1">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">Pilih bulan</span>
          <input
            type="month"
            name="bulan"
            defaultValue={monthKey}
            max={witaTodayKey().slice(0, 7)}
            className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm focus:border-brand/40 focus:outline-none focus:ring-4 focus:ring-brand/10 sm:max-w-[220px]"
          />
        </label>
        <Button type="submit" variant="secondary">
          <BarChart3 aria-hidden className="h-4 w-4" /> Tampilkan
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total pengajuan" value={report.totalBookings} hint={label} tone="brand" />
        <Stat label="Pemanfaatan ruangan" value={`${report.utilization.toFixed(1)}%`} hint="Jam terpakai / jam operasional" tone="free" />
        <Stat
          label="No-show"
          value={`${report.noShow.rate.toFixed(1)}%`}
          hint={`${report.noShow.count} dari reservasi selesai`}
          tone={report.noShow.rate > 5 ? "busy" : "free"}
        />
        <Stat
          label="Ruangan terpadat"
          value={topRoom?.room.code ?? "—"}
          hint={topRoom ? `${topRoom.hours.toFixed(1)} jam terpakai` : "Belum ada data"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">Pemanfaatan per ruangan</h2>
          <div className="surface overflow-x-auto">
            <table className="table-clean min-w-[520px]">
              <thead>
                <tr>
                  <th scope="col">Ruangan</th>
                  <th scope="col" className="text-right">Sesi</th>
                  <th scope="col" className="text-right">Jam</th>
                  <th scope="col" className="w-[180px]">Utilisasi</th>
                </tr>
              </thead>
              <tbody>
                {report.perRoom.map(({ room, bookings, hours, utilization }) => (
                  <tr key={room.id}>
                    <td>
                      <p className="text-[13px] font-medium leading-tight">{room.name}</p>
                      <p className="font-mono text-[10px] text-muted">{room.code}</p>
                    </td>
                    <td className="text-right tabular-nums">{bookings}</td>
                    <td className="text-right tabular-nums">{hours.toFixed(1)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
                          <div
                            className={cn("h-full rounded-full", utilization > 40 ? "bg-brand" : utilization > 15 ? "bg-free" : "bg-muted/40")}
                            style={{ width: `${Math.min(100, utilization)}%` }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted">
                          {utilization.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            Utilisasi dihitung dari sesi berstatus disetujui, check-in, atau selesai dibandingkan total jam operasional
            ({RULES.operatingEndHour - RULES.operatingStartHour} jam/hari) seluruh ruangan aktif.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <TrendingUp aria-hidden className="h-4 w-4 text-brand" /> Jam tersibuk
          </h2>
          <div className="surface space-y-1.5 p-4">
            {report.peakHours.map(({ hour, count }) => (
              <div key={hour} className="flex items-center gap-2">
                <span className="w-9 shrink-0 text-[11px] tabular-nums text-muted">{String(hour).padStart(2, "0")}.00</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-ink/[0.04]">
                  <div
                    className="h-full rounded bg-brand/80"
                    style={{ width: `${(count / maxPeak) * 100}%`, minWidth: count > 0 ? "6px" : 0 }}
                    title={`${count} sesi dimulai pada jam ini`}
                  />
                </div>
                <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-muted">{count}</span>
              </div>
            ))}
          </div>

          <h2 className="pt-2 text-base font-semibold tracking-tight">Komposisi status</h2>
          <div className="surface flex flex-wrap gap-1.5 p-4">
            {statusEntries.map(([status, count]) => (
              <Badge
                key={status}
                tone={
                  status === "approved" || status === "checked_in" || status === "completed"
                    ? "free"
                    : status === "pending"
                      ? "pending"
                      : status === "rejected" || status === "no_show"
                        ? "busy"
                        : "neutral"
                }
              >
                {STATUS_LABEL[status]}: {count}
              </Badge>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
