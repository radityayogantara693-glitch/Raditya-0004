import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "error";

const tones: Record<Tone, { wrap: string; icon: typeof Info }> = {
  info: { wrap: "border-brand/15 bg-brand-soft/60 text-ink", icon: Info },
  success: { wrap: "border-free/15 bg-free-soft/80 text-ink", icon: CheckCircle2 },
  warning: { wrap: "border-pending/20 bg-pending-soft/80 text-ink", icon: AlertTriangle },
  error: { wrap: "border-busy/15 bg-busy-soft/80 text-ink", icon: XCircle },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  actions,
}: {
  tone?: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  const { wrap, icon: Icon } = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border p-3.5 text-sm", wrap, className)}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          tone === "success" && "text-free",
          tone === "error" && "text-busy",
          tone === "warning" && "text-pending",
          tone === "info" && "text-brand",
        )}
      />
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-semibold leading-snug">{title}</p> : null}
        {children ? <div className="text-[13px] leading-relaxed text-ink/80">{children}</div> : null}
        {actions ? <div className="pt-1.5">{actions}</div> : null}
      </div>
    </div>
  );
}
