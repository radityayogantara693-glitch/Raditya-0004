import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "hsl(var(--paper))",
        surface: "hsl(var(--surface))",
        ink: "hsl(var(--ink))",
        muted: "hsl(var(--muted))",
        line: "hsl(var(--line))",
        navy: {
          DEFAULT: "hsl(var(--navy))",
          soft: "hsl(var(--navy-soft))",
        },
        brand: {
          DEFAULT: "hsl(var(--brand))",
          fg: "hsl(var(--brand-fg))",
          soft: "hsl(var(--brand-soft))",
          bright: "hsl(var(--brand-bright))",
          deep: "hsl(var(--brand-deep))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          soft: "hsl(var(--accent-soft))",
        },
        gold: "hsl(var(--gold))",
        free: {
          DEFAULT: "hsl(var(--free))",
          bright: "hsl(var(--free-bright))",
          soft: "hsl(var(--free-soft))",
        },
        pending: {
          DEFAULT: "hsl(var(--pending))",
          bright: "hsl(var(--pending-bright))",
          soft: "hsl(var(--pending-soft))",
        },
        busy: {
          DEFAULT: "hsl(var(--busy))",
          bright: "hsl(var(--busy-bright))",
          soft: "hsl(var(--busy-soft))",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 2px hsl(var(--navy) / 0.05), 0 12px 30px -22px hsl(var(--navy) / 0.35)",
        lift: "0 2px 6px hsl(var(--navy) / 0.06), 0 22px 46px -28px hsl(var(--navy) / 0.4)",
        mark: "0 10px 26px -14px hsl(var(--brand-bright) / 0.8)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scan-sweep": {
          "0%, 100%": { top: "6%", opacity: "0.2" },
          "50%": { top: "92%", opacity: "1" },
        },
        /* Aksen geometris hero — gerak halus, otomatis dimatikan prefers-reduced-motion. */
        "float-soft": {
          "0%, 100%": { transform: "translateY(0) rotate(45deg)" },
          "50%": { transform: "translateY(-14px) rotate(45deg)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.035)" },
        },
      },
      animation: {
        "fade-up": "fade-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scan-sweep": "scan-sweep 2.8s ease-in-out infinite",
        "float-soft": "float-soft 7s ease-in-out infinite",
        "glow-pulse": "glow-pulse 6.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
