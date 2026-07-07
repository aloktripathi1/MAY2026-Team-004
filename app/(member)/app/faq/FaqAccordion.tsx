"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { faqs } from "@/lib/seed-data";

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <PageHeader eyebrow="Help center" title={<>Things people <span className="text-display text-primary italic">actually ask.</span></>} description="Six questions cover most of it. If yours isn't here, raise an issue." />
      <div className="glass-strong overflow-hidden rounded-2xl">
        {faqs.map((f, i) => (
          <button key={i} onClick={() => setOpen(open === i ? null : i)} className="block w-full border-b border-hairline text-left last:border-b-0">
            <div className="flex items-center justify-between gap-4 px-6 py-5 transition hover:bg-surface-2/40">
              <span className="text-sm font-medium md:text-base">{f.q}</span>
              <Plus className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open === i ? "rotate-45 text-primary" : ""}`} />
            </div>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-5 text-sm text-muted-foreground">{f.a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>
    </>
  );
}
