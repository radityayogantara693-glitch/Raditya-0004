import Link from "next/link";
import { ArrowRight, Building2, MapPin, Users } from "lucide-react";

import type { Room } from "@/types";
import { CATEGORY_LABEL } from "@/types";
import { Badge } from "@/components/ui/badge";

export function RoomCard({ room, footer }: { room: Room; footer?: React.ReactNode }) {
  return (
    <article className="surface surface-hover group flex h-full flex-col overflow-hidden">
      <Link href={`/ruangan/${room.id}`} className="flex flex-1 flex-col gap-3 p-4 focus-visible:outline-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">{room.code}</p>
            <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-tight transition-colors group-hover:text-brand">{room.name}</h3>
          </div>
          <Badge tone="brand" className="shrink-0">{CATEGORY_LABEL[room.category]}</Badge>
        </div>

        <p className="line-clamp-2 text-[12px] leading-relaxed text-muted">{room.description}</p>

        <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-[11.5px] text-muted">
          <li className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden className="h-3.5 w-3.5" /> {room.building}, lt. {room.floor}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Users aria-hidden className="h-3.5 w-3.5" /> {room.capacity} orang
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Building2 aria-hidden className="h-3.5 w-3.5" /> {room.facilities.slice(0, 2).join(" · ")}
          </li>
        </ul>
      </Link>

      <div className="flex items-center justify-between gap-2 border-t border-line/80 px-4 py-2">
        <div className="min-w-0">{footer}</div>
        <Link
          href={`/ruangan/${room.id}`}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
        >
          Lihat jadwal <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
