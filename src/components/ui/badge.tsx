import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "free" | "pending" | "busy" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-ink/[0.055] text-ink/75 border-line/80",
  brand: "bg-brand-soft text-brand border-brand/15",
  free: "bg-free-soft text-free border-free/15",
  pending: "bg-pending-soft text-pending border-pending/20",
  busy: "bg-busy-soft text-busy border-busy/15",
  outline: "bg-transparent text-muted border-line",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
