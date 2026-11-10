import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Identitas resmi IDB Bali (logo fullcolor `idb-bali-logo-fullcolor`).
 * - `compact` dipakai pada header ponsel: emblem di atas bidang biru cerah.
 * - `inverse` dipakai pada panel navy: varian logo untuk latar gelap
 *   (`idb-bali-lockup-white.png`) — teks putih, marka teal/oranye tetap berwarna.
 * - `default` dipakai pada permukaan terang: lockup berwarna penuh.
 */
export function BrandLockup({
  href = "/dashboard",
  compact = false,
  tone = "default",
  className,
}: {
  href?: string;
  compact?: boolean;
  tone?: "default" | "inverse";
  className?: string;
}) {
  if (compact) {
    if (tone === "inverse") {
      return (
        <Link
          href={href}
          className={cn(
            "group flex min-w-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--brand))]",
            className,
          )}
        >
          <Image
            src="/brand/idb-bali-lockup-white.png"
            alt="IDB Bali"
            width={162}
            height={106}
            priority
            className="h-auto w-[66px] shrink-0 drop-shadow-[0_2px_8px_rgba(4,24,58,0.25)] transition-transform duration-300 group-hover:-translate-y-0.5"
          />
          <span className="h-8 w-px shrink-0 bg-white/20" aria-hidden />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-white">Ruang Kampus</span>
            <span className="mt-0.5 block truncate text-[8.5px] font-semibold uppercase tracking-[0.15em] text-white/75">
              Sistem Peminjaman
            </span>
          </span>
        </Link>
      );
    }

    return (
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          className,
        )}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[13px] bg-white p-1 shadow-mark ring-1 ring-line transition-transform duration-300 group-hover:-translate-y-0.5">
          <Image
            src="/brand/idb-bali-emblem.png"
            alt=""
            width={34}
            height={34}
            priority
            className="h-full w-full object-contain"
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-bold leading-tight tracking-[-0.02em] text-ink">
            Ruang Kampus
          </span>
          <span className="mt-0.5 block truncate text-[9px] font-semibold uppercase leading-tight tracking-[0.14em] text-muted">
            IDB Bali
          </span>
        </span>
      </Link>
    );
  }

  if (tone === "inverse") {
    return (
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--brand))]",
          className,
        )}
      >
        <Image
          src="/brand/idb-bali-lockup-white.png"
          alt="IDB Bali"
          width={162}
          height={106}
          priority
          className="h-auto w-[86px] shrink-0 drop-shadow-[0_2px_8px_rgba(6,32,74,0.22)] transition-transform duration-300 group-hover:-translate-y-0.5 sm:w-[92px]"
        />
        <span className="h-9 w-px shrink-0 bg-white/20" aria-hidden />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13px] font-semibold tracking-[-0.01em] text-white">Ruang Kampus</span>
          <span className="mt-1 block truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-white/75">
            Sistem Peminjaman
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        className,
      )}
    >
      <Image
        src="/brand/idb-bali-lockup.png"
        alt="IDB Bali"
        width={813}
        height={532}
        priority
        className="h-auto w-[104px] shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5"
      />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[13px] font-semibold tracking-[-0.01em] text-ink">Ruang Kampus</span>
        <span className="mt-1 block truncate text-[8.5px] font-semibold uppercase tracking-[0.15em] text-muted">
          Sistem Peminjaman
        </span>
      </span>
    </Link>
  );
}
