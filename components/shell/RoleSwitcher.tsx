"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type AppRole = "member" | "coordinator" | "admin" | "volunteer" | "faculty";

export type RoleOption = {
  role: AppRole;
  label: string;
  href: string;
  context?: string;
};

export function RoleSwitcher({
  currentRole,
  roles,
}: {
  currentRole: AppRole;
  roles: RoleOption[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const current = roles.find((option) => option.role === currentRole) ?? roles[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (roles.length <= 1 || !current) return null;

  return (
    <div ref={rootRef} className="relative mb-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="night-nav flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sidebar-foreground transition duration-200 hover:border-secondary/30 hover:bg-white/[0.075] active:scale-[0.99]"
      >
        <span className="min-w-0">
          <span className="text-mono-label block text-sidebar-foreground/55">Role context</span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-white">{current.label}</span>
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
          <ChevronDown className={cn("h-4 w-4 text-secondary transition duration-200", open && "rotate-180")} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="night-nav absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl p-1.5 shadow-[0_24px_80px_-48px_oklch(0_0_0_/_95%)]"
          >
            {roles.map((option) => {
              const active = option.role === currentRole || pathname === option.href;
              return (
                <Link
                  key={`${option.role}-${option.href}`}
                  href={option.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group block rounded-xl px-3 py-2.5 text-sm transition duration-200",
                    active
                      ? "bg-white/[0.075] text-white ring-1 ring-secondary/35"
                      : "text-white/62 hover:bg-white/[0.055] hover:text-white",
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-secondary" : "bg-white/24 group-hover:bg-secondary/70")} />
                    {option.label}
                  </span>
                  {option.context && <span className="mt-1 block truncate pl-3.5 font-mono text-[11px] uppercase tracking-[0.08em] opacity-70">{option.context}</span>}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
