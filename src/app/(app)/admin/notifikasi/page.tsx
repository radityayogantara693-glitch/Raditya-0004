import { Mail, Send } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { formatDateTimeWita, relativeTimeWita } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Log Notifikasi" };

export default async function NotificationsPage() {
  await requireUser(["ADMIN"]);
  const notifications = await getRepository().listNotifications(100);
  const driver = process.env.EMAIL_DRIVER ?? "mock";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AP-02"
        title="Log notifikasi email"
        description={
          driver === "resend"
            ? "Email dikirim melalui Resend. Log di bawah mencatat setiap notifikasi yang diproses sistem."
            : "Driver email aktif: mock. Email tidak benar-benar dikirim — isinya direkam di sini agar alur persetujuan dapat diverifikasi saat UAT."
        }
        actions={<Badge tone={driver === "resend" ? "free" : "pending"}>{driver === "resend" ? "Resend aktif" : "Mode mock"}</Badge>}
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-6 w-6" />}
          title="Belum ada notifikasi"
          description="Notifikasi akan tercatat saat pengajuan dikirim, disetujui, ditolak, dibatalkan, atau dilepas karena no-show."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <article key={notification.id} className="surface overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/50 px-4 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Send aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand" />
                  <p className="truncate text-[12px] font-medium">{notification.recipient}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={notification.status === "sent" ? "free" : notification.status === "failed" ? "busy" : "pending"}>
                    {notification.status === "sent" ? "Terkirim" : notification.status === "failed" ? "Gagal" : "Antre"}
                  </Badge>
                  <span className="text-[10.5px] text-muted">
                    {formatDateTimeWita(notification.createdAt)} · {relativeTimeWita(notification.createdAt)}
                  </span>
                </div>
              </div>

              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold">{notification.subject}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted">
                      {notification.bookingId ? `Booking ${notification.bookingId.slice(0, 8)}…` : "Sistem"} · driver{" "}
                      {notification.driver}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold text-brand group-open:hidden">Buka isi</span>
                  <span className="hidden shrink-0 text-[11px] font-semibold text-brand group-open:inline">Tutup</span>
                </summary>
                <pre className="whitespace-pre-wrap border-t border-line bg-paper/40 px-4 py-3 font-sans text-[12px] leading-relaxed text-ink/80">
                  {notification.body}
                </pre>
              </details>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
