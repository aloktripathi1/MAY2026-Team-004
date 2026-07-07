import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatusPill({ tone, children }: { tone: "lime" | "magenta" | "blue" | "amber" | "slate" | "green"; children: ReactNode }) {
  const map: Record<string, string> = {
    lime: "bg-primary/12 text-primary ring-primary/25",
    magenta: "bg-secondary/15 text-secondary ring-secondary/30",
    blue: "bg-accent/15 text-accent ring-accent/30",
    amber: "bg-warning/12 text-warning ring-warning/30",
    slate: "bg-surface-3 text-muted-foreground ring-hairline",
    green: "bg-success/12 text-success ring-success/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ring-1", map[tone])}>
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
        "glass rounded-2xl p-5 transition duration-300",
        hover && "hover:-translate-y-0.5 hover:bg-surface-2/70 hover:ring-1 hover:ring-hairline",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value, delta, hue = "122" }: { label: string; value: string | number; delta?: string; hue?: string }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5">
      <div className="text-mono-label">{label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-display text-4xl leading-none">{value}</span>
        {delta && <span className="text-xs text-success">▲ {delta}</span>}
      </div>
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-40"
        style={{ background: `oklch(0.78 0.2 ${hue})` }}
      />
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
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-full transition active:scale-[0.98]";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-sm" };
  const variants = {
    primary: "bg-primary text-primary-foreground hover:opacity-90 shadow-[0_0_0_1px_oklch(0.93_0.22_122_/_60%)_inset]",
    hot: "bg-secondary text-secondary-foreground hover:opacity-90",
    outline: "border border-hairline bg-surface text-foreground hover:bg-surface-2",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-surface-2",
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {children}
    </button>
  );
}
