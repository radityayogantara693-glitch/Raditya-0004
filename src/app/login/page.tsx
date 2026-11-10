import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarCheck2, Clock, LifeBuoy, MessagesSquare, QrCode, Zap } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/db";
import { safeNextPath } from "@/lib/utils";
import { BrandLockup } from "@/components/layout/brand";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Masuk",
};

const highlights = [
  { icon: CalendarCheck2, title: "Zero collision", body: "Pemeriksaan bentrok otomatis pada setiap pengajuan." },
  { icon: QrCode, title: "Tiket QR", body: "Bukti izin digital, diverifikasi petugas di gedung." },
  { icon: Zap, title: "Respons ≤ 4 jam", body: "Antrean persetujuan terpusat untuk Sarpras." },
];

/**
 * Halaman utama (masuk) disusun vertikal:
 * identitas IDB Bali → hero (foto kampus) → formulir login → informasi bantuan/footer.
 * Layout murni alur dokumen (tanpa absolute untuk memposisikan formulir) sehingga
 * halaman dapat di-scroll natural di semua lebar layar.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  if (user) redirect(safeNextPath(params.next, "/dashboard"));

  return (
    <div className="min-h-dvh">
      {/* ============ IDENTITAS + SECTION HERO (latar foto kampus) ============ */}
      <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
        {/* Foto arsitektur kampus IDB Bali — latar utama hero, dipertahankan dari versi sebelumnya. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/brand/idb-bali-campus.jpg')" }}
        />
        {/* Gradasi gelap agar logo, judul, dan keterangan tetap terbaca di segala lebar layar. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-20 bg-[linear-gradient(102deg,hsl(var(--navy)/0.92)_0%,hsl(var(--navy)/0.66)_52%,hsl(var(--navy)/0.34)_100%)]"
        />
        <div aria-hidden className="absolute inset-0 -z-20 bg-navy/45 sm:bg-navy/25" />
        <div
          aria-hidden
          className="absolute inset-0 -z-20 bg-[radial-gradient(46rem_30rem_at_0%_-10%,hsl(var(--brand-bright)/0.3),transparent_62%)]"
        />

        {/* --- Aksen geometris + animasi ringan --- */}
        <div
          aria-hidden
          className="animate-glow-pulse pointer-events-none absolute -right-24 top-16 -z-10 h-72 w-72 rounded-full border border-white/[0.16] sm:top-20 sm:h-80 sm:w-80"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 top-40 -z-10 h-40 w-40 rounded-full border border-white/[0.14] sm:top-52 sm:h-52 sm:w-52"
          style={{ animationDelay: "1.2s" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-6 top-[46%] -z-10 hidden h-40 w-56 rounded-2xl bg-[radial-gradient(hsl(0_0%_100%/0.24)_1.2px,transparent_1.2px)] bg-[length:16px_16px] opacity-70 [mask-image:linear-gradient(to_left,black,transparent)] sm:block"
        />
        <div
          aria-hidden
          className="animate-float-soft pointer-events-none absolute right-[26%] top-[62%] -z-10 hidden h-9 w-9 rotate-45 rounded-[9px] border border-brand-bright/60 bg-brand-bright/15 lg:block"
          style={{ animationDelay: "1.6s" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-24 -z-10 h-72 w-72 rounded-full border border-white/[0.12]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 left-1/3 -z-10 h-64 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent"
        />

        {/* --- Bar identitas / navbar --- */}
        <header className="container-app relative flex items-center justify-between gap-4 py-4 lg:py-5">
          <BrandLockup href="/" tone="inverse" />
          <a
            href="#bantuan"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-[12px] font-semibold text-white/90 backdrop-blur-sm transition-colors hover:border-white/45 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <LifeBuoy aria-hidden className="h-3.5 w-3.5" />
            Bantuan
          </a>
        </header>

        {/* --- Konten hero --- */}
        <section className="container-app relative flex flex-1 flex-col justify-center gap-6 pb-16 pt-4 sm:gap-7 sm:pb-20 sm:pt-7 lg:gap-8 lg:pb-28 lg:pt-10">
          <div className="max-w-2xl animate-in space-y-4 sm:space-y-5">
            <p className="flex items-center gap-2.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/80">
              <span aria-hidden className="h-px w-6 rounded-full bg-accent" />
              Portal Peminjaman Ruangan
            </p>

            <h1 className="text-balance text-[30px] font-bold leading-[1.07] tracking-[-0.035em] text-white drop-shadow-[0_2px_14px_rgba(6,12,28,0.6)] sm:text-[40px] lg:text-[46px]">
              Satu Tempat untuk{" "}
              <span className="relative sm:whitespace-nowrap">
                <span className="relative text-gold">
                  Seluruh Ruang
                  <span aria-hidden className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gold" />
                </span>{" "}
                <span className="text-white">Kampus.</span>
              </span>
            </h1>

            <p className="max-w-xl text-[14px] leading-relaxed text-white/85 drop-shadow-[0_1px_8px_rgba(6,12,28,0.6)] sm:text-[15.5px]">
              Temukan ruangan, atur jadwal, dan ajukan peminjaman dalam satu portal digital yang terintegrasi.
            </p>

            <div className="pt-1">
              <a
                href="#masuk"
                className="hidden items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-[13px] font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/45 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:inline-flex"
              >
                Masuk ke Portal
                <ArrowRight aria-hidden className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Kartu ringkas: di ponsel jadi pil ringkas, di layar lebar menjadi tiga kartu fitur. */}
          <ul className="flex animate-in max-w-2xl flex-wrap gap-2 sm:grid sm:grid-cols-3 sm:gap-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/[0.09] p-3 backdrop-blur-sm transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.13]"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-white/85">
                    <Icon aria-hidden className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-semibold leading-tight text-white">{item.title}</p>
                    <p className="mt-0.5 hidden text-[11.5px] leading-snug text-white/75 lg:block">{item.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* --- Transisi visual hero → section login (tepian biru + bidang warm ivory) --- */}
        <svg
          aria-hidden
          viewBox="0 0 1440 110"
          preserveAspectRatio="none"
          className="relative block h-12 w-full sm:h-16 lg:h-20"
        >
          <path
            d="M0,64 C240,110 480,16 720,44 C960,72 1200,104 1440,52 L1440,110 L0,110 Z"
            fill="hsl(var(--paper))"
          />
          <path
            d="M0,64 C240,110 480,16 720,44 C960,72 1200,104 1440,52"
            fill="none"
            stroke="hsl(var(--brand-bright) / 0.55)"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* ============ SECTION LOGIN (latar warm white) ============ */}
      <section id="masuk" className="bg-paper">
        <div className="container-app flex flex-col items-center px-4 py-10 sm:py-14 lg:py-16">
          <div className="w-full max-w-[440px] animate-in rounded-3xl border border-line bg-surface p-6 shadow-[0_26px_60px_-34px_hsl(var(--navy)/0.55)] sm:p-7">
            <div className="mb-6 space-y-2">
              <p className="eyebrow">Autentikasi Kampus</p>
              <h2 className="text-[24px] font-bold leading-tight tracking-[-0.03em]">Masuk ke Portal</h2>
              <p className="text-[13px] leading-relaxed text-muted">
                Gunakan akun SSO kampus Anda. Hak akses menyesuaikan peran: mahasiswa/UKM, dosen, admin Sarpras, atau
                petugas gedung.
              </p>
            </div>

            <LoginForm next={params.next} demoMode={isDemoMode} />
          </div>
        </div>
      </section>

      {/* ============ INFORMASI BANTUAN / FOOTER ============ */}
      <footer id="bantuan" className="bg-slate-900">
        <div className="container-app grid gap-8 py-9 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] lg:py-11">
          <div className="space-y-3">
            <BrandLockup href="/" tone="inverse" />
            <p className="max-w-xs text-[12.5px] leading-relaxed text-slate-300">
              Portal digital peminjaman ruangan Institut Desain &amp; Bisnis Bali — 29 ruang kampus, jadwal real-time,
              dan tiket QR untuk check-in gedung.
            </p>
          </div>

          <div>
            <p className="eyebrow text-slate-200">Bantuan</p>
            <ul className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-slate-300">
              <li className="flex items-start gap-2">
                <LifeBuoy aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-bright" />
                Tim Sarana Prasarana membantu pengajuan yang tertunda atau perlu penyesuaian jadwal.
              </li>
              <li className="flex items-start gap-2">
                <Clock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-bright" />
                Layanan harian 07.00–21.00 WITA (UTC+8).
              </li>
              <li className="flex items-start gap-2">
                <MessagesSquare aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-bright" />
                Kendala akun atau teknis dapat dilaporkan kepada Tim IT Kampus.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="eyebrow text-slate-200">Ketentuan</p>
            <p className="text-[12.5px] leading-relaxed text-slate-300">
              Dengan masuk, Anda menyetujui tata tertib peminjaman ruangan dan kebijakan penggunaan data kampus.
            </p>
            <p className="text-[11.5px] leading-relaxed text-slate-400">
              © 2026 IDB Bali · Sarana Prasarana · WITA (UTC+8)
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
