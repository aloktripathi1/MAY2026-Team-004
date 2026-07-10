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
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-left text-sidebar-foreground transition hover:bg-white/10"
      >
        <span className="min-w-0">
          <span className="text-mono-label block text-sidebar-foreground/60">Role</span>
          <span className="block truncate text-sm font-medium">{current.label}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-sidebar-foreground/60 transition", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="glass-strong absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl p-1.5"
          >
            {roles.map((option) => {
              const active = option.role === currentRole || pathname === option.href;
              return (
                <Link
                  key={`${option.role}-${option.href}`}
                  href={option.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-xl px-3 py-2.5 text-sm transition",
                    active ? "bg-primary/10 text-foreground ring-1 ring-primary/25" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  <span className="block font-medium">{option.label}</span>
                  {option.context && <span className="mt-0.5 block truncate text-xs opacity-75">{option.context}</span>}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
