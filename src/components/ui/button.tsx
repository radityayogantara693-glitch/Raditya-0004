import Link from "next/link";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-fg shadow-[0_1px_2px_hsl(var(--navy)/0.16)] hover:bg-brand-deep hover:shadow-[0_12px_26px_-14px_hsl(var(--brand-bright)/0.9)]",
  secondary: "bg-brand-soft text-brand hover:bg-brand-bright/15 hover:text-brand-deep",
  outline: "border border-line bg-surface text-ink hover:border-brand/40 hover:bg-brand-bright/[0.06]",
  ghost: "text-ink hover:bg-navy/[0.055]",
  danger: "bg-busy text-white shadow-sm hover:bg-[hsl(348_84%_36%)] hover:shadow-[0_10px_24px_-14px_hsl(var(--busy-bright)/0.85)]",
  success: "bg-free text-white shadow-sm hover:bg-[hsl(163_94%_20%)] hover:shadow-[0_10px_24px_-14px_hsl(var(--free-bright)/0.85)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px] rounded-lg",
  md: "h-11 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-[15px] rounded-xl",
  icon: "h-11 w-11 rounded-xl",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold",
    "transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright/70 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "motion-safe:active:scale-[0.985]",
    variants[variant],
    sizes[size],
    className,
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

interface ButtonLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  size?: Size;
  href: string;
}

export function ButtonLink({ variant = "primary", size = "md", className, href, ...props }: ButtonLinkProps) {
  return <Link href={href} className={buttonClasses(variant, size, className)} {...props} />;
}
