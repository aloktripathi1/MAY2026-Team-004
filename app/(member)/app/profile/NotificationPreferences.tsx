"use client";

import { useState, useTransition } from "react";
import { toggleNotificationPrefAction } from "./actions";
import type { NotificationPrefs } from "@/lib/notification-prefs";

const ROWS: { key: keyof NotificationPrefs; label: string }[] = [
  { key: "onlyMyClubs", label: "Only clubs I'm in" },
  { key: "suggestedClubEvents", label: "New events from suggested clubs" },
  { key: "pinnedAnnouncementsOnly", label: "Pinned admin announcements only" },
];

export function NotificationPreferences({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    startTransition(async () => {
      await toggleNotificationPrefAction(key);
    });
  }

  return (
    <div className="space-y-3">
      {ROWS.map(({ key, label }) => {
        const on = prefs[key];
        return (
          <label key={key} className="flex items-center justify-between text-sm">
            <span>{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={label}
              disabled={pending}
              onClick={() => toggle(key)}
              className={`inline-flex h-5 w-9 items-center rounded-full transition disabled:opacity-60 ${on ? "bg-secondary" : "bg-white/10"}`}
            >
              <span className={`h-4 w-4 rounded-full bg-background transition ${on ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </label>
        );
      })}
    </div>
  );
}
