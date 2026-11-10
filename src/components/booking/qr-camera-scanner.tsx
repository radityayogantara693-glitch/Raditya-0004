"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, Loader2, ScanLine, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Pemindai QR tiket memakai kamera perangkat (webcam/kamera HP).
 * - Pustaka `jsQR` dimuat dinamis hanya saat kamera dinyalakan (bundle tetap ringan).
 * - Hasil pindai diteruskan ke `onScan` (dipakai form check-in untuk mengisi
 *   kode tiket sekaligus memicu verifikasi otomatis).
 * - Kode yang sama diabaikan selama beberapa detik agar tidak memicu
 *   verifikasi berulang selama QR masih berada di depan kamera.
 */

type ScannerStatus = "idle" | "starting" | "running" | "error";

/** Jeda pengabaian hasil pindai identik (ms). */
const REPEAT_GUARD_MS = 4000;
/** Lebar piksel maksimum untuk decoding agar hemat CPU. */
const DECODE_WIDTH = 640;
/** Jeda antar frame decoding (ms) — timer lebih stabil daripada requestAnimationFrame
 *  yang bisa dihentikan browser saat tab di-throttle/di-background. */
const DECODE_INTERVAL_MS = 120;

function cameraErrorMessage(error: unknown): string {
  const name = (error as { name?: string } | null)?.name;
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Izin kamera ditolak. Izinkan akses kamera (ikon gembok di bilah alamat), lalu aktifkan kembali.";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "Kamera tidak ditemukan pada perangkat ini. Ketik kode tiket secara manual.";
    case "NotReadableError":
    case "TrackStartError":
      return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.";
    default:
      return "Kamera tidak dapat dijalankan (perlu HTTPS atau localhost). Ketik kode tiket secara manual.";
  }
}

export function QrCameraScanner({
  onScan,
  disabled = false,
  scanHint = "Kode diteruskan ke kolom kode tiket.",
}: {
  onScan: (raw: string) => void;
  disabled?: boolean;
  scanHint?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const decodeRef = useRef<typeof import("jsqr").default | null>(null);
  const onScanRef = useRef(onScan);

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    decodeRef.current = null;
    setStatus((current) => (current === "running" || current === "starting" ? "idle" : current));
  }, []);

  // Berhenti saat komponen dilepas agar lampu kamera ikut mati.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const start = useCallback(async () => {
    if (disabled) return;
    setStatus("starting");
    setMessage(null);
    setLastScan(null);
    lastScanRef.current = null;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage("Perangkat/browser ini tidak mendukung kamera (butuh HTTPS atau localhost). Ketik kode tiket manual.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (error) {
      setStatus("error");
      setMessage(cameraErrorMessage(error));
      return;
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStatus("idle");
      return;
    }
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      // autoplay dapat ditolak; biarkan tag video yang memutarnya
    }

    try {
      const module = await import("jsqr");
      decodeRef.current = module.default;
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      video.srcObject = null;
      setStatus("error");
      setMessage("Modul pemindai gagal dimuat. Muat ulang halaman, atau ketik kode tiket manual.");
      return;
    }

    const detect = (raw: string) => {
      const now = Date.now();
      const last = lastScanRef.current;
      if (last && last.value === raw && now - last.at < REPEAT_GUARD_MS) return;
      lastScanRef.current = { value: raw, at: now };
      setLastScan(raw);
      onScanRef.current(raw);
    };

    const tick = () => {
      const canvas = canvasRef.current;
      const decode = decodeRef.current;
      const current = videoRef.current;
      const media = streamRef.current;
      if (!canvas || !decode || !current || !media) return;

      if (document.hidden || current.readyState < 2 || !current.videoWidth) {
        timerRef.current = window.setTimeout(tick, DECODE_INTERVAL_MS);
        return;
      }

      const scale = Math.min(1, DECODE_WIDTH / current.videoWidth);
      const width = Math.max(1, Math.round(current.videoWidth * scale));
      const height = Math.max(1, Math.round(current.videoHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        try {
          context.drawImage(current, 0, 0, width, height);
          const image = context.getImageData(0, 0, width, height);
          const found = decode(image.data, width, height, { inversionAttempts: "attemptBoth" });
          if (found?.data) detect(found.data);
        } catch {
          // frame tidak terbaca (mis. konten terkunci) — hentikan kamera dan tampilkan pesan
          stop();
          setStatus("error");
          setMessage("Gagal membaca frame kamera. Aktifkan kembali kamera, atau ketik kode tiket manual.");
          return;
        }
      }

      timerRef.current = window.setTimeout(tick, DECODE_INTERVAL_MS);
    };

    setStatus("running");
    setMessage("Arahkan kamera ke QR pada tiket sampai kode terbaca.");
    timerRef.current = window.setTimeout(tick, DECODE_INTERVAL_MS);
  }, [disabled, stop]);

  const running = status === "running";

  function toggle() {
    if (running || status === "starting") stop();
    else void start();
  }

  const statusLabel =
    status === "running"
      ? "Kamera menyala — pemindaian aktif"
      : status === "starting"
        ? "Menyiapkan kamera…"
        : status === "error"
          ? "Kamera tidak aktif"
          : "Kamera mati";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
            <Camera aria-hidden className={cn("h-3.5 w-3.5", running ? "text-free" : "text-muted")} />
            Kamera perangkat
          </p>
          <p className="text-[11px] leading-snug text-muted">{statusLabel}</p>
        </div>
        <Button
          type="button"
          size="md"
          variant={running ? "outline" : "primary"}
          onClick={toggle}
          disabled={disabled || status === "starting"}
          aria-pressed={running}
        >
          {status === "starting" ? (
            <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
          ) : running ? (
            <CameraOff aria-hidden className="h-3.5 w-3.5" />
          ) : (
            <Camera aria-hidden className="h-3.5 w-3.5" />
          )}
          {status === "starting" ? "Memulai…" : running ? "Nonaktifkan kamera" : "Aktifkan kamera"}
        </Button>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-line bg-navy">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-hidden
          className={cn("h-full w-full object-cover", running ? "block" : "hidden")}
        />
        <canvas ref={canvasRef} className="hidden" aria-hidden />

        {!running ? (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <div className="space-y-1.5">
              <ScanLine aria-hidden className="mx-auto h-6 w-6 text-brand-bright" />
              <p className="text-[12px] font-semibold text-white">Kamera nonaktif</p>
              <p className="mx-auto max-w-[26rem] text-[11px] leading-relaxed text-white/60">
                Aktifkan kamera untuk memindai QR tiket pengunjung, atau ketik kode tiket pada kolom di bawah.
              </p>
            </div>
          </div>
        ) : null}

        {running ? (
          <>
            <span
              aria-hidden
              className="animate-scan-sweep pointer-events-none absolute left-5 right-5 h-[2px] rounded-full bg-brand-bright shadow-[0_0_12px_hsl(var(--brand-bright)/0.9)] motion-reduce:animation-none"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 via-navy/45 to-transparent px-3 pb-2 pt-7 text-center text-[11px] font-medium text-white/85"
            >
              Arahkan kamera ke QR pada tiket
            </div>
          </>
        ) : null}
      </div>

      {status === "error" && message ? (
        <p className="flex items-start gap-1.5 rounded-lg border border-busy/25 bg-busy-soft/70 px-3 py-2 text-[11.5px] leading-relaxed text-busy">
          <ShieldAlert aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {message}
        </p>
      ) : null}

      {lastScan ? (
        <p className="flex items-start gap-1.5 rounded-lg border border-free/25 bg-free-soft/70 px-3 py-2 text-[11.5px] leading-relaxed text-free">
          <CheckCircle2 aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0">
            Kode terbaca: <span className="font-mono font-semibold break-all">{lastScan}</span>. {scanHint}
          </span>
        </p>
      ) : null}
    </div>
  );
}
