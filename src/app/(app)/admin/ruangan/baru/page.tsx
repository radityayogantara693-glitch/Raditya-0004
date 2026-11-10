import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { RoomForm } from "@/components/admin/room-form";
import { createRoomAction } from "@/app/actions/rooms";

export const metadata = { title: "Tambah Ruangan" };

export default async function NewRoomPage() {
  await requireUser(["ADMIN"]);

  return (
    <div className="space-y-5">
      <Link href="/admin/ruangan" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink">
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" /> Daftar ruangan
      </Link>

      <PageHeader eyebrow="Master data" title="Tambah ruangan baru" description="Ruangan baru langsung tersedia di katalog setelah disimpan." />

      <RoomForm action={createRoomAction} submitLabel="Simpan & aktifkan" />
    </div>
  );
}
