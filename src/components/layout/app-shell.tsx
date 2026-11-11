import { Info, LogOut } from "lucide-react";

import type { User } from "@/types";
import { ROLE_LABEL } from "@/types";
import { isDemoMode } from "@/lib/db";
import { initials } from "@/lib/utils";
import { BottomNav, SidebarNav } from "@/components/layout/nav";
import { BrandLockup } from "@/components/layout/brand";
import { logoutAction } from "@/app/actions/auth";

function UserCard({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-bright text-[11px] font-bold text-navy"
      >
        {initials(user.fullName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-white">{user.fullName}</p>
        <p className="truncate text-[11px] leading-tight text-white/55">{user.organization ?? ROLE_LABEL[user.role]}</p>
      </div>
    </div>
  );
}

function DemoBanner() {
  return (
    <div className="no-print border-b border-pending/25 bg-pending-soft">
      <div className="container-app flex items-center gap-2 py-1.5 text-[11px] font-medium text-pending">
        <Info aria-hidden className="h-3.5 w-3.5 shrink-0" />
        <p>
          Mode demo lokal — data tersimpan di <code className="font-mono">.data/db.json</code> (di memori bila
          filesystem read-only).
        </p>
      </div>
    </div>
  );
}

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:pl-[268px]">
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col overflow-hidden bg-navy px-4 py-5 text-white/75 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-28 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,hsl(var(--brand-bright)/0.45),transparent_70%)] blur-2xl"
        />

        <div className="relative">
          <BrandLockup tone="inverse" />
        </div>

        <div className="relative mt-7 flex-1 overflow-y-auto">
          <p className="mb-2.5 px-3 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-white/45">Menu</p>
          <SidebarNav role={user.role} />
        </div>

        <div className="relative mt-4 space-y-3 border-t border-white/10 pt-4">
          <UserCard user={user} />
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright/70"
            >
              <LogOut aria-hidden className="h-3.5 w-3.5" />
              Keluar dari akun
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="panel-navy no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/10 px-4 text-white shadow-[0_14px_30px_-28px_hsl(var(--navy)/1)] lg:hidden">
          <BrandLockup compact tone="inverse" />
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Keluar dari akun"
              className="grid h-10 w-10 place-items-center rounded-full bg-brand-bright text-[11px] font-bold text-navy ring-1 ring-white/25 transition-transform duration-200 hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              {initials(user.fullName)}
            </button>
          </form>
        </header>

        {isDemoMode ? <DemoBanner /> : null}

        <main id="konten" className="container-app flex-1 pb-28 pt-5 sm:pt-7 lg:pb-12">
          {children}
        </main>
      </div>

      <BottomNav role={user.role} />
    </div>
  );
}
