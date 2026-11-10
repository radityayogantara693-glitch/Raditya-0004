"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarCheck2, CheckCircle2, Loader2, Send, Users } from "lucide-react";

import type { Role } from "@/types";
import { CATEGORY_LABEL } from "@/types";
import { submitBooking } from "@/app/actions/bookings";
import { idleState } from "@/lib/action-state";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FieldError, Hint, Input, Select, Textarea } from "@/components/ui/field";

const TIME_OPTIONS = Array.from({ length: 15 }, (_, index) => `${String(index + 7).padStart(2, "0")}:00`);

export interface RoomOption {
  id: string;
  code: string;
  name: string;
  capacity: number;
  category: keyof typeof CATEGORY_LABEL;
  building: string;
  floor: number;
}

export function BookingForm({
  rooms,
  defaults,
  minDate,
  maxDate,
  windowLabel,
  maxDurationHours,
  userRole,
  organization,
  quota,
}: {
  rooms: RoomOption[];
  defaults: { roomId: string; date: string; startTime: string; endTime: string };
  minDate: string;
  maxDate: string;
  windowLabel: string;
  maxDurationHours: number;
  userRole: Role;
  organization: string | null;
  quota: { used: number; limit: number } | null;
}) {
  const [state, formAction, pending] = useActionState(submitBooking, idleState);
  const [roomId, setRoomId] = useState(defaults.roomId);
  const [date, setDate] = useState(defaults.date);
  const [startTime, setStartTime] = useState(defaults.startTime);
  const [endTime, setEndTime] = useState(defaults.endTime);
  const [eventName, setEventName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [attendees, setAttendees] = useState("20");

  const selectedRoom = rooms.find((room) => room.id === roomId);
  const attendeesNumber = Number(attendees);
  const capacityWarning = selectedRoom && attendeesNumber > selectedRoom.capacity;

  if (state.status === "success") {
    return (
      <div className="surface space-y-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-free-soft text-free">
            <CheckCircle2 aria-hidden className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Pengajuan terkirim</h2>
            <p className="text-sm leading-relaxed text-muted">{state.message}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.bookingId ? (
            <ButtonLink href={`/riwayat/${state.bookingId}`}>
              Buka detail pengajuan <ArrowRight aria-hidden className="h-4 w-4" />
            </ButtonLink>
          ) : null}
          <ButtonLink href="/riwayat" variant="outline">
            Lihat riwayat
          </ButtonLink>
          <ButtonLink href="/ajukan" variant="ghost">
            Buat pengajuan lain
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="surface space-y-5 p-4 sm:p-5">
        {state.status === "error" && state.message ? (
          <Alert
            tone="error"
            title="Pengajuan belum dapat dikirim"
            actions={
              state.alternatives?.length ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted">Ruangan alternatif:</span>
                  {state.alternatives.map((alternative) => (
                    <button
                      key={alternative.id}
                      type="button"
                      onClick={() => setRoomId(alternative.id)}
                      className="rounded-full border border-brand/25 bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-fg"
                    >
                      {alternative.code} · {alternative.name}
                    </button>
                  ))}
                </div>
              ) : null
            }
          >
            {state.message}
          </Alert>
        ) : null}

        <div className="space-y-4">
          <Field label="Ruangan" htmlFor="roomId" required error={state.errors?.roomId}>
            <Select
              id="roomId"
              name="roomId"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              required
            >
              <option value="" disabled>
                Pilih ruangan
              </option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.code} — {room.name} · {CATEGORY_LABEL[room.category]} · {room.capacity} org
                </option>
              ))}
            </Select>
            {selectedRoom ? (
              <Hint>
                {selectedRoom.building}, lantai {selectedRoom.floor} · kapasitas {selectedRoom.capacity} orang
              </Hint>
            ) : null}
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tanggal" htmlFor="date" required error={state.errors?.date} hint={windowLabel} className="sm:col-span-3 sm:max-w-xs">
              <Input
                id="date"
                name="date"
                type="date"
                min={minDate}
                max={maxDate}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jam mulai" htmlFor="startTime" required error={state.errors?.startTime}>
              <Select
                id="startTime"
                name="startTime"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time.replace(":", ".")} WITA
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Jam selesai" htmlFor="endTime" required error={state.errors?.endTime} hint={`Maks. ${maxDurationHours} jam`}>
              <Select
                id="endTime"
                name="endTime"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                required
              >
                {TIME_OPTIONS.slice(1).concat("22:00").map((time) => (
                  <option key={time} value={time}>
                    {time.replace(":", ".")} WITA
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Nama kegiatan" htmlFor="eventName" required error={state.errors?.eventName}>
            <Input
              id="eventName"
              name="eventName"
              maxLength={120}
              minLength={5}
              placeholder="Contoh: Latihan Fotografi Produk UKM Fotografi"
              value={eventName}
              onChange={(event) => setEventName(event.target.value)}
              required
            />
          </Field>

          <Field
            label="Estimasi peserta"
            htmlFor="attendees"
            required
            error={state.errors?.attendees}
            hint={selectedRoom ? `Kapasitas ${selectedRoom.capacity} orang` : undefined}
          >
            <Input
              id="attendees"
              name="attendees"
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              value={attendees}
              onChange={(event) => setAttendees(event.target.value)}
              required
            />
            {capacityWarning ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-pending">
                <AlertTriangle aria-hidden className="h-3.5 w-3.5" /> Peserta melebihi kapasitas ruangan.
              </p>
            ) : null}
          </Field>

          <Field
            label="Keperluan / deskripsi kegiatan"
            htmlFor="purpose"
            required
            error={state.errors?.purpose}
            hint="Minimal 10 karakter"
          >
            <Textarea
              id="purpose"
              name="purpose"
              minLength={10}
              maxLength={1000}
              rows={4}
              placeholder="Jelaskan tujuan kegiatan, perlengkapan yang dibutuhkan, dan penanggung jawab di lokasi."
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              required
            />
          </Field>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-relaxed text-muted">
            Dengan mengirim, Anda menyatakan data yang diisi benar dan bersedia mematuhi tata tertib ruangan.
          </p>
          <Button type="submit" size="lg" disabled={pending || Boolean(capacityWarning) || !roomId} className="sm:w-auto">
            {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Send aria-hidden className="h-4 w-4" />}
            {pending ? "Mengirim…" : "Kirim pengajuan"}
          </Button>
        </div>
      </div>

      <aside className="space-y-3">
        <div className="surface-flat space-y-3 p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold">
            <CalendarCheck2 aria-hidden className="h-4 w-4 text-brand" /> Ringkasan aturan
          </p>
          <ul className="space-y-2 text-[12px] leading-relaxed text-muted">
            <li>
              <span className="font-medium text-ink">Batas pengajuan.</span> {windowLabel} untuk peran{" "}
              {userRole === "MAHASISWA" ? "mahasiswa/UKM" : userRole === "DOSEN" ? "dosen" : "Anda"}.
            </li>
            <li>
              <span className="font-medium text-ink">Durasi.</span> Maksimal {maxDurationHours} jam per peminjaman, dalam
              jam operasional 07.00–21.00 WITA.
            </li>
            <li>
              <span className="font-medium text-ink">Bentrok.</span> Slot yang sudah diajukan (meski masih menunggu) tidak
              dapat diajukan ganda.
            </li>
            <li>
              <span className="font-medium text-ink">Check-in.</span> Tiket QR wajib dipindai di gedung. Lewat 30 menit
              dari jam mulai, slot dilepas otomatis.
            </li>
          </ul>
        </div>

        {organization ? (
          <div className="surface-flat p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <Users aria-hidden className="h-4 w-4 text-brand" /> Organisasi
            </p>
            <p className="mt-1 text-[12px] text-muted">{organization}</p>
            {quota ? (
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>Kuota aktif</span>
                  <span className={cn("font-semibold", quota.used >= quota.limit ? "text-busy" : "text-ink")}>
                    {quota.used}/{quota.limit}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                  <div
                    className={cn("h-full rounded-full", quota.used >= quota.limit ? "bg-busy" : "bg-brand")}
                    style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }}
                  />
                </div>
                {quota.used >= quota.limit ? (
                  <p className="mt-2 text-[11px] text-busy">
                    Kuota penuh. Selesaikan atau batalkan salah satu pengajuan aktif.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-xl border border-dashed border-line p-4 text-[11px] leading-relaxed text-muted">
          <p className="font-semibold text-ink">Butuh ruangan mendadak?</p>
          <p className="mt-1">
            Pengajuan kurang dari H-2 untuk kegiatan UKM tidak dapat diproses. Hubungi Sarpras di gedung A lantai 1 untuk
            kondisi khusus.
          </p>
          <Link href="/kalender" className="mt-2 inline-flex items-center gap-1 font-semibold text-brand hover:underline">
            Cek kalender ketersediaan <ArrowRight aria-hidden className="h-3 w-3" />
          </Link>
        </div>
        <FieldError>{state.errors?.form}</FieldError>
      </aside>
    </form>
  );
}
