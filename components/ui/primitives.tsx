import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatusPill({ tone, children }: { tone: "lime" | "magenta" | "blue" | "amber" | "slate" | "green"; children: ReactNode }) {
  const map: Record<string, string> = {
    lime: "bg-success/[0.12] text-success ring-success/[0.28]",
    magenta: "bg-primary/[0.16] text-white ring-primary/30",
    blue: "bg-accent/[0.12] text-accent ring-accent/[0.28]",
    amber: "bg-secondary/[0.14] text-secondary ring-secondary/[0.32]",
    slate: "bg-white/[0.045] text-muted-foreground ring-white/10",
    green: "bg-success/[0.12] text-success ring-success/[0.28]",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ring-1", map[tone])}>
      <span className="h-1 w-1 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function GlassCard({
  className, children, hover = true,
}: { className?: string; children: ReactNode; hover?: boolean }) {
  return (
    <div
      className={cn(
        "night-panel rounded-2xl p-5 transition duration-200",
        hover && "hover:-translate-y-0.5 hover:border-secondary/35 hover:bg-surface-2/70",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value, delta }: { label: string; value: string | number; delta?: string }) {
  return (
    <div className="night-panel relative overflow-hidden rounded-2xl p-5">
      <div className="text-mono-label">{label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-4xl font-semibold leading-none tracking-[-0.08em] text-white">{value}</span>
        {delta && <span className="text-xs text-secondary">{delta}</span>}
      </div>
    </div>
  );
}

export function Btn({
  variant = "primary", size = "md", children, className, ...props
}: {
  variant?: "primary" | "ghost" | "outline" | "hot";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-3 text-sm" };
  const variants = {
    primary: "gold-cta text-secondary-foreground",
    hot: "bg-primary text-primary-foreground shadow-[0_16px_42px_-28px_oklch(0.47_0.16_24_/_85%)] hover:bg-primary/90",
    outline: "border border-white/[0.12] bg-white/[0.035] text-foreground hover:border-white/[0.24] hover:bg-white/[0.06]",
    ghost: "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {children}
    </button>
  );
}
