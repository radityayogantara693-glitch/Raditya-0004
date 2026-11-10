"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  DoorOpen,
  History,
  LayoutDashboard,
  Mail,
  PlusCircle,
  ScanLine,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/types";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  MAHASISWA: [
    { href: "/dashboard", label: "Beranda", icon: LayoutDashboard, exact: true },
    { href: "/ruangan", label: "Ruangan", icon: DoorOpen },
    { href: "/kalender", label: "Kalender", icon: CalendarDays },
    { href: "/ajukan", label: "Ajukan", icon: PlusCircle },
    { href: "/riwayat", label: "Riwayat", icon: History },
  ],
  DOSEN: [
    { href: "/dashboard", label: "Beranda", icon: LayoutDashboard, exact: true },
    { href: "/ruangan", label: "Ruangan", icon: DoorOpen },
    { href: "/kalender", label: "Kalender", icon: CalendarDays },
    { href: "/ajukan", label: "Ajukan", icon: PlusCircle },
    { href: "/riwayat", label: "Riwayat", icon: History },
  ],
  ADMIN: [
    { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard, exact: true },
    { href: "/admin", label: "Persetujuan", icon: ClipboardCheck },
    { href: "/admin/ruangan", label: "Ruangan", icon: Building2 },
    { href: "/admin/laporan", label: "Laporan", icon: BarChart3 },
    { href: "/admin/notifikasi", label: "Notifikasi", icon: Mail },
  ],
  SATPAM: [
    { href: "/dashboard", label: "Beranda", icon: LayoutDashboard, exact: true },
    { href: "/checkin", label: "Check-In", icon: ScanLine },
  ],
};

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];

  return (
    <nav aria-label="Navigasi utama" className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-brand-bright/[0.16] text-white ring-1 ring-brand-bright/40 before:absolute before:-left-1 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-brand-bright before:shadow-[0_0_10px_hsl(var(--brand-bright)/0.9)]"
                : "text-white/70 hover:bg-white/[0.07] hover:text-white",
            )}
          >
            <Icon
              aria-hidden
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                active ? "text-brand-bright" : "text-white/50 group-hover:text-white/85",
              )}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];

  return (
    <nav
      aria-label="Navigasi bawah"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className={cn("mx-auto grid max-w-lg", items.length === 2 ? "grid-cols-2" : "grid-cols-5")}>
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold leading-none transition-colors",
                  active
                    ? "text-brand before:absolute before:inset-x-5 before:top-0 before:h-[2px] before:rounded-full before:bg-brand-bright"
                    : "text-muted hover:text-ink",
                )}
              >
                <Icon aria-hidden className={cn("h-[21px] w-[21px]", active ? "stroke-[2.2]" : "stroke-[1.8]")} />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
