"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

export function EventsTabToggle({ tab }: { tab: "upcoming" | "past" }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="night-panel relative rounded-xl p-1">
      {(["upcoming", "past"] as const).map((t) => {
        const active = tab === t;
        return (
          <Link
            key={t}
            href={`/volunteer/events?tab=${t}`}
            className={`relative inline-block rounded-lg px-3.5 py-1.5 text-xs capitalize transition ${
              active ? "text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {active && (
              <motion.span
                layoutId="volunteer-events-tab"
                className="absolute inset-0 rounded-lg bg-secondary"
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            <span className="relative">{t}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function EventsTabPanel({ tab, children }: { tab: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className="space-y-3">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease }}
        className="space-y-3"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
