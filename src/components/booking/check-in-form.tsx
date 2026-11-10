"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Keyboard, Loader2, ScanLine, Ticket } from "lucide-react";

import { checkIn } from "@/app/actions/bookings";
import { idleState } from "@/lib/action-state";
import { extractTicketCode } from "@/lib/ticket";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { QrCameraScanner } from "@/components/booking/qr-camera-scanner";
import { cn } from "@/lib/utils";

export interface ExpectedTicket {
  code: string;
  bookingCode: string;
  eventName: string;
  room: string;
  time: string;
}

export function CheckInForm({ defaultCode, expected }: { defaultCode?: string; expected: ExpectedTicket[] }) {
  const [state, formAction, pending] = useActionState(checkIn, idleState);
  const [code, setCode] = useState(defaultCode ?? "");
  const [autoVerify, setAutoVerify] = useState(true);

  /** Kirim kode ke server untuk diverifikasi (dipakai tombol manual & hasil pindai). */
  function verify(value: string) {
    const data = new FormData();
    data.set("code", value);
    // Dipanggil dari luar submit form (hasil pindai kamera), jadi dibungkus transition
    // agar status `pending` dan aksi tetap berjalan sebagaimana mestinya.
    startTransition(() => {
      formAction(data);
    });
  }

  /** Hasil pindai kamera: isi kolom kode tiket, lalu verifikasi bila otomatis aktif. */
  function handleScan(raw: string) {
    const extracted = extractTicketCode(raw);
    setCode(extracted);
    if (autoVerify && !pending) verify(extracted);
  }

  return (
    <div className="space-y-4">
      <div className="surface overflow-hidden">
        <div className="panel-navy relative flex items-center gap-2 overflow-hidden px-4 py-3 text-white">
          <ScanLine aria-hidden className="h-4 w-4 text-brand-bright" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Simulasi pemindai tiket</p>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-brand-bright/90" />
        </div>

        <div className="border-b border-line p-4 sm:p-5">
          <QrCameraScanner
            onScan={handleScan}
            scanHint={
              autoVerify
                ? "Kode diisi ke kolom dan verifikasi dijalankan otomatis."
                : "Kode dimasukkan ke kolom — tekan Verifikasi untuk memeriksanya."
            }
          />
        </div>

        <form action={formAction} className="space-y-3 p-4 sm:p-5">
          <label htmlFor="code" className="text-[12.5px] font-semibold">
            Kode tiket
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="code"
              name="code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="IDB-XXXX-XXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="h-12 flex-1 font-mono text-[15px] tracking-wider"
              required
            />
            <Button type="submit" size="lg" disabled={pending || code.trim().length < 6} className="sm:w-auto">
              {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ScanLine aria-hidden className="h-4 w-4" />}
              {pending ? "Memverifikasi…" : "Verifikasi"}
            </Button>
          </div>

          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
            <Keyboard aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Pindai QR dengan kamera perangkat, atau ketik kode yang tertera di bawah QR. Pemeriksaan memvalidasi tanggal,
            status pengajuan, dan jendela check-in.
          </p>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-[11.5px] leading-snug text-muted transition-colors hover:border-brand/35 focus-within:ring-2 focus-within:ring-brand/40">
            <input
              type="checkbox"
              checked={autoVerify}
              onChange={(event) => setAutoVerify(event.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[hsl(var(--brand))]"
            />
            <span>
              Verifikasi otomatis begitu kode terbaca dari kamera. Matikan bila ingin memeriksa kode dulu sebelum
              dikirim.
            </span>
          </label>
        </form>
      </div>

      {state.status === "success" ? (
        <div className="rounded-2xl border border-free/15 bg-free-soft/60 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-free text-white">
              <CheckCircle2 aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-[15px] font-semibold text-free">Check-in berhasil</p>
              <p className="text-[12.5px] leading-relaxed text-ink/80">{state.message}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                {state.ticketCode ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-free/25 bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-free">
                    <Ticket aria-hidden className="h-3 w-3" /> {state.ticketCode}
                  </span>
                ) : null}
                {state.bookingId ? (
                  <Link
                    href={`/riwayat/${state.bookingId}`}
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand hover:underline"
                  >
                    Lihat detail <ArrowRight aria-hidden className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <Alert tone="error" title="Check-in ditolak">
          {state.message}
        </Alert>
      ) : null}

      {expected.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Tiket yang diharapkan hari ini</p>
          <div className="grid gap-2">
            {expected.map((ticket) => (
              <button
                key={ticket.code}
                type="button"
                onClick={() => setCode(ticket.code)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left transition-colors",
                  "hover:border-brand/35 hover:bg-brand-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                  code === ticket.code && "border-brand/50 bg-brand-soft/60",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-medium">{ticket.eventName}</span>
                  <span className="block truncate text-[10.5px] text-muted">
                    {ticket.room} · {ticket.time} · {ticket.bookingCode}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[11px] font-semibold text-brand">{ticket.code}</span>
              </button>
            ))}
          </div>
          <p className="text-[10.5px] leading-relaxed text-muted">
            Dalam mode demo, ketuk salah satu kartu untuk mengisi kode secara otomatis, lalu tekan Verifikasi.
          </p>
        </div>
      ) : null}
    </div>
  );
}
