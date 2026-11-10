import Link from "next/link";

import type { RoomAvailability } from "@/types";
import { hourLabel, witaDateKey, witaTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { AvailabilityLegend } from "@/components/booking/status-badge";

const cellStyles: Record<RoomAvailability["slots"][number]["status"], string> = {
  free: "bg-free-soft/80 hover:bg-free-soft text-free/80 hover:text-free",
  pending: "bg-pending-soft text-pending",
  busy: "bg-busy-soft text-busy",
  closed: "bg-ink/[0.03] text-muted/50",
};

export function AvailabilityGrid({
  grid,
  dateKey,
  showLegend = true,
}: {
  grid: RoomAvailability[];
  dateKey: string;
  showLegend?: boolean;
}) {
  const isToday = dateKey === witaDateKey();
  const nowHour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Makassar", hour: "2-digit", hour12: false }).format(new Date()),
  );
  const hours = grid[0]?.slots.map((slot) => slot.hour) ?? [];

  return (
    <div className="space-y-3">
      {showLegend ? <AvailabilityLegend /> : null}

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <caption className="sr-only">
            Ketersediaan ruangan per jam pada {dateKey}. Hijau kosong, kuning diproses, merah terisi.
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-[190px] border-b border-line bg-surface px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted"
              >
                Ruangan
              </th>
              {hours.map((hour) => (
                <th
                  key={hour}
                  scope="col"
                  className={cn(
                    "border-b border-l border-line/70 px-0 py-2.5 text-center text-[10px] font-semibold tabular-nums text-muted",
                    isToday && hour === nowHour && "bg-brand-soft text-brand",
                  )}
                >
                  {hourLabel(hour)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map(({ room, slots }) => (
              <tr key={room.id} className="group">
                <th scope="row" className="sticky left-0 z-10 border-b border-line/70 bg-surface px-3 py-2 text-left align-middle">
                  <Link href={`/ruangan/${room.id}?tanggal=${dateKey}`} className="block min-w-0 focus-visible:outline-none">
                    <span className="flex items-center gap-1.5">
                      <span className="rounded bg-ink/[0.05] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink/70">
                        {room.code}
                      </span>
                      <span className="truncate text-[12.5px] font-semibold leading-tight group-hover:text-brand">
                        {room.name}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[10.5px] text-muted">
                      {room.building} · lt. {room.floor} · {room.capacity} org
                    </span>
                  </Link>
                </th>

                {slots.map((slot) => {
                  const label =
                    slot.status === "free"
                      ? `Kosong ${hourLabel(slot.hour)}`
                      : slot.status === "pending"
                        ? `Diproses ${hourLabel(slot.hour)}`
                        : slot.status === "busy"
                          ? `Terisi ${hourLabel(slot.hour)}`
                          : `Tutup ${hourLabel(slot.hour)}`;

                  const content = (
                    <span
                      className={cn(
                        "flex h-10 items-center justify-center rounded-md text-[10px] font-semibold",
                        cellStyles[slot.status],
                        slot.status === "free" && "transition-colors duration-200",
                      )}
                    >
                      {slot.status === "free" ? "+" : null}
                    </span>
                  );

                  return (
                    <td key={slot.hour} className="border-b border-l border-line/60 p-0.5 align-middle">
                      {slot.status === "free" ? (
                        <Link
                          href={`/ajukan?ruangan=${room.id}&tanggal=${dateKey}&mulai=${String(slot.hour).padStart(2, "0")}:00&selesai=${String(slot.hour + 1).padStart(2, "0")}:00`}
                          title={`${label} — ajukan peminjaman`}
                          aria-label={`${room.name}, ${label}, ajukan peminjaman`}
                          className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                        >
                          {content}
                        </Link>
                      ) : (
                        <span
                          title={
                            slot.booking
                              ? `${slot.booking.eventName} · ${witaTime(slot.booking.startAt)}–${witaTime(slot.booking.endAt)}`
                              : label
                          }
                          aria-label={`${room.name}, ${label}${slot.booking ? `, ${slot.booking.eventName}` : ""}`}
                          className="block rounded"
                        >
                          {content}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
