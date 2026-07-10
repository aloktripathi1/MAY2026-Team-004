"use client";

import { useState } from "react";

const PREFERENCES = [
  "Only clubs I'm in",
  "New events from suggested clubs",
  "Pinned admin announcements only",
] as const;

export function NotificationPreferences() {
  const [enabled, setEnabled] = useState([true, true, false]);

  function toggle(index: number) {
    setEnabled((prev) => prev.map((value, i) => (i === index ? !value : value)));
  }

  return (
    <div className="space-y-3">
      {PREFERENCES.map((label, i) => {
        const on = enabled[i];
        return (
          <button
            key={label}
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => toggle(i)}
            className="flex w-full items-center justify-between text-left text-sm"
          >
            <span>{label}</span>
            <span className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${on ? "bg-secondary" : "bg-white/10"}`}>
              <span className={`h-4 w-4 rounded-full bg-background transition ${on ? "translate-x-4" : "translate-x-0.5"}`} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
