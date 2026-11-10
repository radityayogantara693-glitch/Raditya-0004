import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="text-balance text-[26px] font-bold leading-[1.1] tracking-[-0.032em] sm:text-[31px]">{title}</h1>
        {description ? <p className="max-w-2xl text-[13px] leading-relaxed text-muted sm:text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line/90 px-6 py-10 text-center", className)}>
      {icon ? <div className="mb-1 text-muted/70">{icon}</div> : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="max-w-sm text-[13px] leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "brand" | "pending" | "busy" | "free";
  icon?: React.ReactNode;
}) {
  const toneClass = {
    default: "text-ink",
    brand: "text-brand",
    pending: "text-pending",
    busy: "text-busy",
    free: "text-free",
  }[tone];

  return (
    <div className="surface-flat p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
        {icon ? <span className="text-muted/60">{icon}</span> : null}
      </div>
      <p className={cn("mt-2.5 font-display text-[28px] font-bold leading-none tracking-[-0.03em] tabular-nums", toneClass)}>{value}</p>
      {hint ? <p className="mt-2 text-[11px] leading-snug text-muted">{hint}</p> : null}
    </div>
  );
}
