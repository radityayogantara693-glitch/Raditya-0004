"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import type { RoomState } from "@/app/actions/rooms";
import type { Room } from "@/types";
import { CATEGORY_LABEL } from "@/types";
import { FACILITY_OPTIONS, ROOM_CATEGORIES } from "@/lib/rules";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

const initialState: RoomState = { status: "idle" };

export function RoomForm({
  action,
  room,
  submitLabel = "Simpan ruangan",
}: {
  action: (prev: RoomState, formData: FormData) => Promise<RoomState>;
  room?: Room;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="surface space-y-5 p-4 sm:p-5">
      {state.status === "error" && state.message ? (
        <Alert tone="error" title="Data belum tersimpan">
          {state.message}
        </Alert>
      ) : null}
      {state.status === "success" && state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Kode ruangan" htmlFor="code" required error={state.errors?.code} hint="Contoh: STD-01">
          <Input id="code" name="code" defaultValue={room?.code} maxLength={12} required placeholder="STD-01" />
        </Field>

        <Field label="Nama ruangan" htmlFor="name" required error={state.errors?.name} className="sm:col-span-2">
          <Input id="name" name="name" defaultValue={room?.name} maxLength={80} required placeholder="A.1.1 (STUDIO POLA)" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jenis ruangan" htmlFor="category" required error={state.errors?.category}>
          <Select id="category" name="category" defaultValue={room?.category ?? "RUANG_KELAS"} required>
            {ROOM_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABEL[category]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Gedung" htmlFor="building" required error={state.errors?.building}>
          <Input id="building" name="building" defaultValue={room?.building} maxLength={60} required placeholder="Gedung A" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Lantai" htmlFor="floor" required error={state.errors?.floor}>
          <Input id="floor" name="floor" type="number" min={1} max={10} defaultValue={room?.floor ?? 1} required />
        </Field>
        <Field label="Kapasitas (orang)" htmlFor="capacity" required error={state.errors?.capacity}>
          <Input id="capacity" name="capacity" type="number" min={1} max={500} defaultValue={room?.capacity ?? 30} required />
        </Field>
        <Field label="Status" htmlFor="isActive" hint="Nonaktif = tidak dapat diajukan">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              defaultChecked={room?.isActive ?? true}
              className="h-4 w-4 rounded border-line text-brand focus:ring-brand/30"
            />
            Ruangan aktif
          </label>
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-[13px] font-semibold">Fasilitas</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FACILITY_OPTIONS.map((facility) => (
            <label
              key={facility}
              className="flex items-center gap-2 rounded-lg border border-line bg-paper/50 px-3 py-2 text-[12.5px]"
            >
              <input
                type="checkbox"
                name="facilities"
                value={facility}
                defaultChecked={room?.facilities.includes(facility)}
                className="h-4 w-4 rounded border-line text-brand focus:ring-brand/30"
              />
              {facility}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Deskripsi" htmlFor="description" error={state.errors?.description} hint="Maks. 500 karakter">
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={room?.description}
          placeholder="Keterangan singkat mengenai fungsi dan perlengkapan ruangan."
        />
      </Field>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Save aria-hidden className="h-4 w-4" />}
          {pending ? "Menyimpan…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
