"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, HeartPulse, RotateCcw } from "lucide-react";

/**
 * Batas error global untuk halaman yang gagal dirender (mis. basis data belum
 * dikonfigurasi). Tanpa file ini Next.js menampilkan "This page couldn't load".
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] render error:", error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-7 text-center shadow-[0_26px_60px_-34px_hsl(var(--navy)/0.55)]">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-busy-soft text-busy">
          <AlertTriangle aria-hidden className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-[22px] font-bold leading-tight tracking-[-0.02em]">
          Halaman gagal dimuat
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Terjadi kendala pada server. Jika masalah berlanjut, kemungkinan layanan basis data
          belum terhubung. Coba muat ulang, atau periksa status sistem.
        </p>

        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] text-muted">Kode: {error.digest}</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-semibold text-brand-fg transition-colors hover:bg-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45"
          >
            <RotateCcw aria-hidden className="h-4 w-4" /> Coba lagi
          </button>
          <Link
            href="/api/health"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45"
          >
            <HeartPulse aria-hidden className="h-4 w-4" /> Status sistem
          </Link>
        </div>
      </div>
    </main>
  );
}
