"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseTime(s: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Wraps rather than clamps at the edges — spinning past 23 rolls to 0, like a clock. */
function wrap(n: number, max: number) {
  return ((n % (max + 1)) + (max + 1)) % (max + 1);
}

function NumberStepper({
  value, max, onChange,
}: { value: string; max: number; onChange: (next: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const stepRef = useRef((_delta: number) => {});
  stepRef.current = (delta: number) => {
    const current = value === "" ? 0 : Number(value);
    onChange(pad(wrap(current + delta, max)));
  };

  // React attaches onWheel as a passive listener, so preventDefault() there is
  // silently ignored (and warns) — a native listener is required to stop the
  // page/modal from scrolling while the value is being spun.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      stepRef.current(e.deltaY < 0 ? 1 : -1);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function step(delta: number) {
    stepRef.current(delta);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="number"
        min={0}
        max={max}
        placeholder={max === 23 ? "HH" : "MM"}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 2))}
        className="h-12 w-16 rounded-md border border-white/[0.12] bg-white/[0.05] pl-3 pr-5 text-center text-base tabular-nums text-white outline-none [appearance:textfield] focus:border-secondary/55 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div className="absolute inset-y-0 right-0.5 flex flex-col justify-center">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => step(1)}
          aria-label="Increase"
          className="grid h-4 w-4 place-items-center rounded text-muted-foreground/70 transition hover:bg-white/[0.1] hover:text-white"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => step(-1)}
          aria-label="Decrease"
          className="grid h-4 w-4 place-items-center rounded text-muted-foreground/70 transition hover:bg-white/[0.1] hover:text-white"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function TimePicker({
  name, defaultValue = "12:00", required,
}: { name: string; defaultValue?: string; required?: boolean }) {
  const parsedDefault = useMemo(() => parseTime(defaultValue), [defaultValue]);
  const [value, setValue] = useState(defaultValue);
  const [hourInput, setHourInput] = useState(parsedDefault ? pad(parsedDefault.hour) : "");
  const [minuteInput, setMinuteInput] = useState(parsedDefault ? pad(parsedDefault.minute) : "");
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelHeight = 150;
      const openUpward = rect.top >= panelHeight || rect.top > window.innerHeight - rect.bottom;
      setCoords({
        top: openUpward ? rect.top - panelHeight - 8 : rect.bottom + 8,
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

  function commit(nextHour: string, nextMinute: string) {
    setHourInput(nextHour);
    setMinuteInput(nextMinute);
    if (nextHour === "" || nextMinute === "") {
      setValue("");
      return;
    }
    const h = clamp(Number(nextHour), 0, 23);
    const m = clamp(Number(nextMinute), 0, 59);
    setValue(`${pad(h)}:${pad(m)}`);
  }

  function setNow() {
    const now = new Date();
    commit(pad(now.getHours()), pad(now.getMinutes()));
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
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={value ? "text-white" : "text-muted-foreground/60"}>{value || "Select time"}</span>
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
              <div className="flex items-center justify-center gap-2 py-2">
                <NumberStepper value={hourInput} max={23} onChange={(next) => commit(next, minuteInput)} />
                <span className="text-base font-semibold text-white">:</span>
                <NumberStepper value={minuteInput} max={59} onChange={(next) => commit(hourInput, next)} />
                <span className="pl-0.5 text-[11px] text-muted-foreground/70">24h</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-white/[0.08] pt-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => { commit("", ""); setOpen(false); }}
                  className="text-muted-foreground transition hover:text-white"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={setNow}
                  className="font-medium text-secondary transition hover:text-secondary/80"
                >
                  Now
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
