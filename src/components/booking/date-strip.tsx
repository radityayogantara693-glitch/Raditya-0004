import Link from "next/link";

import { addDaysToKey, witaShortDate, witaTodayKey, witaWeekday } from "@/lib/time";
import { cn } from "@/lib/utils";

export function DateStrip({
  dateKey,
  hrefBase,
  days = 7,
  param = "tanggal",
}: {
  dateKey: string;
  hrefBase: string;
  days?: number;
  param?: string;
}) {
  const today = witaTodayKey();
  const start = dateKey < today ? dateKey : today;
  const dates = Array.from({ length: days }, (_, index) => addDaysToKey(start, index));

  return (
    <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {dates.map((key) => {
        const active = key === dateKey;
        const isToday = key === today;
        return (
          <Link
            key={key}
            href={`${hrefBase}?${param}=${key}`}
            aria-current={active ? "date" : undefined}
            className={cn(
              "flex min-w-[58px] flex-1 flex-col items-center gap-0.5 rounded-xl border px-2 py-2 text-center transition-colors",
              active
                ? "border-brand bg-brand text-brand-fg"
                : "border-line bg-surface text-ink hover:border-brand/30 hover:bg-brand-soft/40",
            )}
          >
            <span className={cn("text-[10px] uppercase tracking-wide", active ? "text-brand-fg/70" : "text-muted")}>
              {isToday ? "Hari ini" : witaWeekday(key)}
            </span>
            <span className="font-display text-base font-semibold leading-none">
              {new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", day: "2-digit" }).format(
                new Date(`${key}T12:00:00+08:00`),
              )}
            </span>
            <span className={cn("text-[10px] leading-none", active ? "text-brand-fg/70" : "text-muted")}>
              {witaShortDate(key).split(" ")[1] ?? ""}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
