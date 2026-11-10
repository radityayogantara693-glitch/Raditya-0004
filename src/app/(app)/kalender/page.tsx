import { CalendarDays, Info } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { getAvailability } from "@/lib/services/queries";
import { witaLongDate, witaTodayKey } from "@/lib/time";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DateStrip } from "@/components/booking/date-strip";
import { AvailabilityGrid } from "@/components/booking/availability-grid";

export const metadata = { title: "Kalender Ketersediaan" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ tanggal?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const dateKey = params.tanggal ?? witaTodayKey();
  const { grid } = await getAvailability(dateKey);

  const pendingCount = grid.reduce((total, entry) => total + entry.slots.filter((slot) => slot.status === "pending").length, 0);
  const freeCount = grid.reduce((total, entry) => total + entry.slots.filter((slot) => slot.status === "free").length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ketersediaan real-time"
        title="Kalender ruangan"
        description={witaLongDate(dateKey)}
        actions={
          <ButtonLink href={`/ajukan?tanggal=${dateKey}`} variant="primary">
            <CalendarDays aria-hidden className="h-4 w-4" /> Ajukan pada tanggal ini
          </ButtonLink>
        }
      />

      <DateStrip dateKey={dateKey} hrefBase="/kalender" />

      <div className="grid grid-cols-3 gap-2">
        <div className="surface-flat px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">Slot kosong</p>
          <p className="font-display text-xl font-semibold text-free">{freeCount}</p>
        </div>
        <div className="surface-flat px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">Menunggu</p>
          <p className="font-display text-xl font-semibold text-pending">{pendingCount}</p>
        </div>
        <div className="surface-flat px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">Ruangan</p>
          <p className="font-display text-xl font-semibold">{grid.length}</p>
        </div>
      </div>

      <AvailabilityGrid grid={grid} dateKey={dateKey} />

      <div className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3.5 text-[12px] leading-relaxed text-muted">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p>
          Slot berwarna kuning berarti pengajuan sudah masuk dan menunggu keputusan admin — slot sudah dikunci sehingga
          tidak dapat diajukan ganda. Slot merah sudah disetujui atau sedang dipakai. Klik salah satu slot hijau untuk
          membuka formulir dengan isian otomatis.
        </p>
      </div>
    </div>
  );
}
