"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId } from "react";
import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnOverlay = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnOverlay?: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onOpenChange, open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center px-4 py-6 text-white">
          <motion.button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 cursor-default bg-[oklch(0.035_0.006_285_/_78%)] backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => {
              if (closeOnOverlay) onOpenChange(false);
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className={cn(
              "night-nav relative max-h-[min(88vh,760px)] w-full overflow-hidden rounded-2xl shadow-[0_42px_120px_-58px_oklch(0.47_0.16_24_/_75%),0_22px_80px_-60px_oklch(0.78_0.13_78_/_60%)]",
              sizeClass[size],
            )}
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/[0.025] px-5 py-4">
              <div className="min-w-0">
                <div className="text-mono-label mb-2 text-white/50">Sangam control</div>
                <h2 id={titleId} className="text-lg font-semibold leading-6 text-white">{title}</h2>
                {description && <p id={descriptionId} className="mt-1 max-w-prose text-sm leading-6 text-white/64">{description}</p>}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/12 bg-white/[0.04] text-white/62 transition duration-200 hover:border-white/22 hover:bg-white/[0.075] hover:text-white active:scale-[0.98]"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(min(88vh,760px)-9rem)] overflow-y-auto bg-[oklch(0.075_0.01_285_/_82%)] px-5 py-5 text-sm text-white/82">
              {children}
            </div>
            {footer && <div className="border-t border-white/10 bg-white/[0.025] px-5 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
