"use client";

import { useState } from "react";
import { Check, Copy, Download, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { ticketPayload, ticketVerifyUrl } from "@/lib/ticket";
import { formatDateTimeWita, witaTime } from "@/lib/time";
import { Button } from "@/components/ui/button";

export interface TicketView {
  code: string;
  bookingCode: string;
  eventName: string;
  roomName: string;
  roomCode: string;
  startAt: string;
  endAt: string;
  status: "issued" | "used" | "revoked" | "expired";
  checkedInAt: string | null;
}

export function TicketCard({ ticket }: { ticket: TicketView }) {
  const [copied, setCopied] = useState(false);
  const payload = ticketPayload(ticket.code);
  const url = ticketVerifyUrl(ticket.code);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(ticket.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const statusLabel = {
    issued: "Aktif — tunjukkan saat tiba",
    used: ticket.checkedInAt ? `Sudah check-in ${formatDateTimeWita(ticket.checkedInAt)}` : "Sudah check-in",
    revoked: "Dibatalkan — tiket tidak berlaku",
    expired: "Kedaluwarsa",
  }[ticket.status];

  return (
    <div className="surface overflow-hidden">
      <div className="panel-navy relative flex items-center justify-between gap-3 border-b border-navy px-4 py-2.5 text-white">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/70">Tiket Digital</p>
        <p className="font-mono text-[11px] font-semibold tracking-wider">{ticket.code}</p>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-brand-bright/90" />
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:gap-5 sm:p-5">
        <div className="mx-auto flex flex-col items-center gap-2 sm:mx-0">
          <div className="rounded-xl border border-line bg-white p-2.5">
            <QRCodeSVG value={payload} size={148} level="M" bgColor="#ffffff" fgColor="#111827" title={`QR ${ticket.code}`} />
          </div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted">Pindai di gedung</p>
        </div>

        <div className="min-w-0 space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Kegiatan</p>
            <p className="text-[15px] font-semibold leading-snug">{ticket.eventName}</p>
            <p className="text-[12px] text-muted">
              {ticket.roomName} ({ticket.roomCode})
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted">Tanggal</dt>
              <dd className="font-medium">{formatDateTimeWita(ticket.startAt)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted">Jam</dt>
              <dd className="font-medium">
                {witaTime(ticket.startAt)} – {witaTime(ticket.endAt)} WITA
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted">Kode pengajuan</dt>
              <dd className="font-mono text-[11px] font-medium">{ticket.bookingCode}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted">Status</dt>
              <dd className={ticket.status === "issued" ? "font-medium text-free" : "font-medium text-muted"}>{statusLabel}</dd>
            </div>
          </dl>

          <div className="no-print flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={copyCode}>
              {copied ? <Check aria-hidden className="h-3.5 w-3.5 text-free" /> : <Copy aria-hidden className="h-3.5 w-3.5" />}
              {copied ? "Kode disalin" : "Salin kode"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer aria-hidden className="h-3.5 w-3.5" /> Cetak
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.open(url, "_blank", "noopener")}>
              <Download aria-hidden className="h-3.5 w-3.5" /> Buka tautan verifikasi
            </Button>
          </div>
        </div>
      </div>

      <p className="border-t border-dashed border-line px-4 py-2.5 text-[11px] leading-relaxed text-muted sm:px-5">
        Check-in dibuka 45 menit sebelum jam mulai. Jika belum check-in hingga 30 menit setelah jam mulai, slot dilepas
        otomatis (no-show).
      </p>
    </div>
  );
}
