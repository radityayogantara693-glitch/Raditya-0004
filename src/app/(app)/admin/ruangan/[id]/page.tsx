import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { RoomForm } from "@/components/admin/room-form";
import { updateRoomAction } from "@/app/actions/rooms";

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["ADMIN"]);
  const { id } = await params;
  const room = await getRepository().getRoom(id);
  if (!room) notFound();

  const action = updateRoomAction.bind(null, room.id);

  return (
    <div className="space-y-5">
      <Link href="/admin/ruangan" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink">
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" /> Daftar ruangan
      </Link>

      <PageHeader
        eyebrow={`${room.code} · ${room.name}`}
        title="Ubah data ruangan"
        description="Perubahan kapasitas atau fasilitas langsung tampil di katalog dan formulir pengajuan."
      />

      <RoomForm action={action} room={room} />
    </div>
  );
}
