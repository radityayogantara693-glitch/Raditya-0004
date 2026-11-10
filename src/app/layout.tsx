import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Sistem Peminjaman Ruangan IDB Bali";

export const metadata: Metadata = {
  title: {
    default: appName,
    template: `%s · IDB Ruangan`,
  },
  description:
    "Portal peminjaman ruangan kampus IDB Bali: cek ketersediaan real-time, ajukan peminjaman, dan verifikasi tiket QR di gedung.",
  applicationName: appName,
  robots: { index: false, follow: false },
  icons: {
    icon: "/brand/idb-bali-emblem.png",
    apple: "/brand/idb-bali-mark.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={sans.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-fg"
        >
          Lewati ke konten utama
        </a>
        {children}
      </body>
    </html>
  );
}
