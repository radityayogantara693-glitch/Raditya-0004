import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock, MapPin, Users } from "lucide-react";

import type { BookingDetail } from "@/types";
import { witaShortDate, witaTimeRange, witaWeekday } from "@/lib/time";
import { StatusBadge } from "@/components/booking/status-badge";
import { cn } from "@/lib/utils";

export function BookingRow({
  booking,
  href,
  action,
  showOwner = false,
  className,
}: {
  booking: BookingDetail;
  href?: string;
  action?: React.ReactNode;
  showOwner?: boolean;
  className?: string;
}) {
  const date = new Date(booking.startAt);
  const day = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", month: "short" }).format(date);

  const body = (
    <>
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-paper text-center leading-none">
        <span className="font-display text-base font-semibold">{day}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted">{month}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-semibold leading-tight">{booking.eventName}</p>
          <StatusBadge status={booking.status} short className="shrink-0" />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden className="h-3 w-3" /> {booking.room.code} · {booking.room.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="h-3 w-3" /> {witaTimeRange(booking.startAt, booking.endAt)} WITA
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays aria-hidden className="h-3 w-3" /> {witaWeekday(booking.startAt)}, {witaShortDate(booking.startAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users aria-hidden className="h-3 w-3" /> {booking.attendees}
          </span>
        </p>
        {showOwner ? (
          <p className="mt-0.5 truncate text-[11.5px] text-muted">
            {booking.user.fullName} · {booking.organization ?? booking.user.email}
          </p>
        ) : null}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border border-line/80 bg-surface p-3 transition-colors",
        href && "hover:border-brand/25",
        className,
      )}
    >
      {href ? (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-none">
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {action}
        {href ? (
          <Link
            href={href}
            aria-label={`Buka detail ${booking.code}`}
            className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            <ArrowUpRight aria-hidden className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
