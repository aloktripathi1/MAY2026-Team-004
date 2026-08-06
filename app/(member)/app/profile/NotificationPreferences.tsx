"use client";

import { useState, useTransition } from "react";
import { toggleNotificationPrefAction } from "./actions";
import { EMAIL_CATEGORY_LABELS, type NotificationPrefs } from "@/lib/notification-prefs";

const IN_APP_ROWS: { key: keyof NotificationPrefs; label: string }[] = [
  { key: "onlyMyClubs", label: "Only clubs I'm in" },
  { key: "suggestedClubEvents", label: "New events from suggested clubs" },
  { key: "pinnedAnnouncementsOnly", label: "Pinned admin announcements only" },
];

const EMAIL_ROWS: { key: keyof NotificationPrefs; label: string }[] = [
  { key: "emailAnnouncements", label: EMAIL_CATEGORY_LABELS.announcements },
  { key: "emailEvents", label: EMAIL_CATEGORY_LABELS.events },
  { key: "emailTasks", label: EMAIL_CATEGORY_LABELS.tasks },
  { key: "emailMembership", label: EMAIL_CATEGORY_LABELS.membership },
  { key: "emailIssues", label: EMAIL_CATEGORY_LABELS.issues },
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

  function row({ key, label }: { key: keyof NotificationPrefs; label: string }) {
    const on = prefs[key];
    return (
      <label key={key} className="flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={label}
          disabled={pending}
          onClick={() => toggle(key)}
          className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-60 ${on ? "bg-secondary" : "bg-white/10"}`}
        >
          <span className={`h-4 w-4 rounded-full bg-background transition ${on ? "translate-x-4" : "translate-x-0.5"}`} />
        </button>
      </label>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">{IN_APP_ROWS.map(row)}</div>

      <div className="space-y-3 border-t border-hairline pt-4">
        <div className="text-mono-label">Email me about</div>
        {EMAIL_ROWS.map(row)}
        <p className="text-xs text-muted-foreground">
          Account emails like signup verification are always sent.
        </p>
      </div>
    </div>
  );
}
