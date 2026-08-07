"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISODate(s: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDisplay(s: string) {
  const d = parseISODate(s);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DatePicker({
  name, defaultValue = "", required, min,
}: { name: string; defaultValue?: string; required?: boolean; min?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseISODate(defaultValue) ?? new Date());
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const minDate = min ? parseISODate(min) : null;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelHeight = 300;
      const openUpward = rect.top >= panelHeight || rect.top > window.innerHeight - rect.bottom;
      setCoords({
        top: openUpward ? rect.top - panelHeight - 6 : rect.bottom + 6,
        left: rect.left,
      });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function selectDay(d: Date) {
    if (minDate && d < minDate) return;
    setValue(toISODate(d));
    setOpen(false);
  }

  function changeMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1));
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} required={required} />
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 text-left text-sm text-white outline-none transition hover:border-white/[0.2] focus:border-secondary/55"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={value ? "text-white" : "text-muted-foreground/60"}>
          {value ? formatDisplay(value) : "Select date"}
        </span>
      </button>
      {mounted && createPortal(
        <AnimatePresence>
          {open && coords && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: "fixed", top: coords.top, left: coords.left }}
              className="night-panel z-[80] w-60 rounded-lg p-2 shadow-[0_30px_90px_-40px_oklch(0_0_0/85%)]"
            >
              <div className="mb-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  aria-label="Previous month"
                  className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-white/[0.06] hover:text-white"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <div className="text-xs font-medium text-white">{MONTHS[month]} {year}</div>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  aria-label="Next month"
                  className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-white/[0.06] hover:text-white"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-7 text-center text-[10px] text-muted-foreground/70">
                {WEEKDAYS.map((w, i) => (
                  <div key={i} className="py-0.5">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs">
                {cells.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const selected = value ? sameDay(d, parseISODate(value)!) : false;
                  const isToday = sameDay(d, today);
                  const disabled = Boolean(minDate && d < minDate);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectDay(d)}
                      className={`mx-auto grid h-7 w-7 place-items-center rounded-md transition ${
                        selected
                          ? "bg-secondary text-secondary-foreground font-semibold"
                          : disabled
                            ? "cursor-not-allowed text-muted-foreground/25"
                            : isToday
                              ? "text-secondary hover:bg-white/[0.08]"
                              : "text-white hover:bg-white/[0.08]"
                      }`}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-white/[0.08] pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => { setValue(""); setOpen(false); }}
                  className="text-muted-foreground transition hover:text-white"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => { setViewDate(new Date()); selectDay(new Date()); }}
                  className="font-medium text-secondary transition hover:text-secondary/80"
                >
                  Today
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
