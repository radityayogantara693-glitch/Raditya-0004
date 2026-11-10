import type { BookingStatus } from "@/types";
import { STATUS_LABEL } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const toneMap: Record<BookingStatus, { tone: "pending" | "free" | "busy" | "neutral" | "brand"; dot: string }> = {
  pending: { tone: "pending", dot: "bg-pending" },
  approved: { tone: "free", dot: "bg-free" },
  checked_in: { tone: "free", dot: "bg-free" },
  completed: { tone: "neutral", dot: "bg-muted/60" },
  rejected: { tone: "busy", dot: "bg-busy" },
  cancelled: { tone: "neutral", dot: "bg-muted/60" },
  no_show: { tone: "busy", dot: "bg-busy" },
};

export function StatusBadge({
  status,
  className,
  short = false,
}: {
  status: BookingStatus;
  className?: string;
  short?: boolean;
}) {
  const config = toneMap[status];
  const label =
    short && status === "pending"
      ? "Menunggu"
      : short && status === "checked_in"
        ? "Check-In"
        : STATUS_LABEL[status];

  return (
    <Badge tone={config.tone} className={className}>
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {label}
    </Badge>
  );
}

export function AvailabilityLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] border border-free/20 bg-free-soft" /> Kosong
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] border border-pending/20 bg-pending-soft" /> Diproses
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] border border-busy/20 bg-busy-soft" /> Terisi
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] border border-line bg-paper" /> Tutup / lewat
      </span>
    </div>
  );
}
