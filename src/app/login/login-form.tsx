"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";

import { loginAction, type LoginState } from "@/app/actions/auth";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { ROLE_LABEL } from "@/types";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm({ next, demoMode }: { next?: string; demoMode: boolean }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [email, setEmail] = useState("putu@idb.ac.id");
  const [password, setPassword] = useState("idb-demo");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email Kampus" htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="nama@idb.ac.id"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={state.error ? true : undefined}
            required
          />
        </Field>

        <Field label="Kata Sandi" htmlFor="password" required>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={state.error ? true : undefined}
              className="pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45"
            >
              {showPassword ? (
                <EyeOff aria-hidden className="h-4 w-4" />
              ) : (
                <Eye aria-hidden className="h-4 w-4" />
              )}
            </button>
          </div>
        </Field>

        {state.error ? <Alert tone="error">{state.error}</Alert> : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <KeyRound aria-hidden className="h-4 w-4" />}
          {pending ? "Memeriksa…" : "Masuk"}
          {!pending ? <ArrowRight aria-hidden className="h-4 w-4" /> : null}
        </Button>
      </form>

      {demoMode ? (
        <div className="space-y-2 rounded-xl border border-line bg-paper/70 p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            <ShieldCheck aria-hidden className="h-3.5 w-3.5" /> Akun demo
          </p>
          <div className="grid gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword("idb-demo");
                }}
                aria-pressed={email === account.email}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                  email === account.email
                    ? "bg-brand-soft/80 ring-1 ring-brand/15"
                    : "hover:bg-ink/[0.04]",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium leading-tight">{account.label}</span>
                  <span className="block truncate text-[11px] leading-tight text-muted">{account.hint}</span>
                </span>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-brand">
                  {ROLE_LABEL[account.role].split(" /")[0]}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            Pilih akun di atas lalu tekan masuk. Kata sandi demo dapat diisi apa saja.
          </p>
        </div>
      ) : null}
    </div>
  );
}
