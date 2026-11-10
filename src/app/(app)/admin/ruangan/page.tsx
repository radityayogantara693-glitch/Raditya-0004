import Link from "next/link";
import { Building2, Pencil, PlusCircle, Users } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { CATEGORY_LABEL } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { toggleRoomAction } from "@/app/actions/rooms";

export const metadata = { title: "Kelola Ruangan" };

export default async function AdminRoomsPage() {
  await requireUser(["ADMIN"]);
  const rooms = await getRepository().listRooms({ includeInactive: true });
  const activeCount = rooms.filter((room) => room.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Master data"
        title="Kelola ruangan"
        description={`${activeCount} dari ${rooms.length} ruangan aktif. Ruangan nonaktif tidak muncul di katalog dan tidak dapat diajukan.`}
        actions={
          <ButtonLink href="/admin/ruangan/baru">
            <PlusCircle aria-hidden className="h-4 w-4" /> Tambah ruangan
          </ButtonLink>
        }
      />

      <div className="surface divide-y divide-line">
        {rooms.map((room) => (
          <div key={room.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <Building2 aria-hidden className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">{room.code}</span>
                  <Badge tone="outline">{CATEGORY_LABEL[room.category]}</Badge>
                  <Badge tone={room.isActive ? "free" : "busy"}>{room.isActive ? "Aktif" : "Nonaktif"}</Badge>
                </div>
                <p className="mt-0.5 truncate text-[14px] font-semibold">{room.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-muted">
                  <span>{room.building}, lt. {room.floor}</span>
                  <span className="inline-flex items-center gap-1">
                    <Users aria-hidden className="h-3 w-3" /> {room.capacity} orang
                  </span>
                  <span className="truncate">{room.facilities.join(" · ")}</span>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:justify-end">
              <Link
                href={`/admin/ruangan/${room.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[12px] font-semibold text-ink transition-colors hover:border-ink/25"
              >
                <Pencil aria-hidden className="h-3.5 w-3.5" /> Ubah
              </Link>
              <form action={toggleRoomAction.bind(null, room.id, !room.isActive)}>
                <Button type="submit" size="sm" variant={room.isActive ? "ghost" : "secondary"}>
                  {room.isActive ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        Menonaktifkan ruangan tidak membatalkan pengajuan yang sudah disetujui. Pastikan tidak ada jadwal berjalan sebelum
        menonaktifkan ruangan untuk perawatan.
      </p>
    </div>
  );
}
