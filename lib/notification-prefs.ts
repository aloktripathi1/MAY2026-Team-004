export type NotificationPrefs = {
  /** In-app feed scoping (predates email). */
  onlyMyClubs: boolean;
  suggestedClubEvents: boolean;
  pinnedAnnouncementsOnly: boolean;
  /**
   * Per-category email opt-outs (#113). The three flags above only ever
   * governed what the in-app feed showed, so none of them can express "don't
   * mail me" — these do. Default on: a member who joins a club expects to hear
   * about its events. Transactional mail (signup verification, password-style
   * confirmations) deliberately has no flag; it isn't marketing and must always
   * reach the account owner.
   */
  emailAnnouncements: boolean;
  emailEvents: boolean;
  emailTasks: boolean;
  emailMembership: boolean;
  emailIssues: boolean;
};

/** Categories a recipient can switch off. Keep in sync with EMAIL_CATEGORY. */
export type EmailCategory = "announcements" | "events" | "tasks" | "membership" | "issues";

export const EMAIL_PREF_KEYS: Record<EmailCategory, keyof NotificationPrefs> = {
  announcements: "emailAnnouncements",
  events: "emailEvents",
  tasks: "emailTasks",
  membership: "emailMembership",
  issues: "emailIssues",
};

export const EMAIL_CATEGORY_LABELS: Record<EmailCategory, string> = {
  announcements: "Announcements from my clubs",
  events: "Event updates, reminders and registrations",
  tasks: "Volunteer task assignments and reminders",
  membership: "Membership requests and approvals",
  issues: "Updates on issues I raised",
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  onlyMyClubs: true,
  suggestedClubEvents: true,
  pinnedAnnouncementsOnly: false,
  emailAnnouncements: true,
  emailEvents: true,
  emailTasks: true,
  emailMembership: true,
  emailIssues: true,
};

export function parseNotificationPrefs(value: unknown): NotificationPrefs {
  if (typeof value !== "string") return DEFAULT_NOTIFICATION_PREFS;
  try {
    const parsed = JSON.parse(value);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_NOTIFICATION_PREFS;
    }
    // Only accept booleans for known keys. Rows written before this change
    // simply lack the email keys and fall back to the defaults above.
    const next: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS };
    for (const key of Object.keys(DEFAULT_NOTIFICATION_PREFS) as (keyof NotificationPrefs)[]) {
      const raw = (parsed as Record<string, unknown>)[key];
      if (typeof raw === "boolean") next[key] = raw;
    }
    return next;
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

/** True when this recipient still wants email for `category`. */
export function wantsEmail(prefsJson: unknown, category: EmailCategory): boolean {
  return parseNotificationPrefs(prefsJson)[EMAIL_PREF_KEYS[category]];
}
