import Link from "next/link";
import { CalendarDays, PlusCircle } from "lucide-react";

import type { BookingStatus } from "@/types";
import { requireUser } from "@/lib/auth/session";
import { canCancel } from "@/lib/rules";
import { getUserBookings } from "@/lib/services/queries";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { BookingRow } from "@/components/booking/booking-row";
import { CancelBookingButton } from "@/components/booking/cancel-booking-button";

export const metadata = { title: "Riwayat Peminjaman" };

const TABS: Array<{ key: string; label: string; statuses?: BookingStatus[] }> = [
  { key: "semua", label: "Semua" },
  { key: "aktif", label: "Aktif", statuses: ["pending", "approved", "checked_in"] },
  { key: "pending", label: "Menunggu", statuses: ["pending"] },
  { key: "disetujui", label: "Disetujui", statuses: ["approved", "checked_in"] },
  { key: "selesai", label: "Selesai", statuses: ["completed"] },
  { key: "ditolak", label: "Ditolak / No-show", statuses: ["rejected", "no_show"] },
  { key: "dibatalkan", label: "Dibatalkan", statuses: ["cancelled"] },
];

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const { status } = await searchParams;
  const activeTab = TABS.find((tab) => tab.key === status) ?? TABS[0];

  const bookings = await getUserBookings(user.id);
  const filtered = activeTab.statuses
    ? bookings.filter((booking) => activeTab.statuses!.includes(booking.status))
    : bookings;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pemohon"
        title="Riwayat pengajuan"
        description="Pantau status pengajuan, unduh tiket QR, atau batalkan peminjaman sebelum jadwal dimulai."
        actions={
          <ButtonLink href="/ajukan">
            <PlusCircle aria-hidden className="h-4 w-4" /> Ajukan baru
          </ButtonLink>
        }
      />

      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((tab) => {
          const count = tab.statuses
            ? bookings.filter((booking) => tab.statuses!.includes(booking.status)).length
            : bookings.length;
          const active = tab.key === activeTab.key;
          return (
            <Link
              key={tab.key}
              href={tab.key === "semua" ? "/riwayat" : `/riwayat?status=${tab.key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                active
                  ? "border-brand bg-brand text-brand-fg"
                  : "border-line bg-surface text-muted hover:border-brand/30 hover:text-ink",
              )}
            >
              {tab.label}
              <span className={cn("rounded-full px-1.5 text-[10px]", active ? "bg-brand-fg/15" : "bg-ink/[0.05]")}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="Belum ada pengajuan pada kategori ini"
          description="Pengajuan yang Anda kirim akan muncul di sini beserta status terbarunya."
          action={
            <ButtonLink href="/ajukan" size="sm">
              <PlusCircle aria-hidden className="h-3.5 w-3.5" /> Ajukan peminjaman
            </ButtonLink>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              href={`/riwayat/${booking.id}`}
              action={canCancel(booking) ? <CancelBookingButton bookingId={booking.id} bookingCode={booking.code} /> : undefined}
            />
          ))}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted">
        Pembatalan hanya dapat dilakukan sebelum jam mulai. Setelah check-in, perubahan jadwal harus melalui Sarpras.
      </p>
    </div>
  );
}
