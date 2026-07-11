export type NotificationPrefs = {
  onlyMyClubs: boolean;
  suggestedClubEvents: boolean;
  pinnedAnnouncementsOnly: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  onlyMyClubs: true,
  suggestedClubEvents: true,
  pinnedAnnouncementsOnly: false,
};

export function parseNotificationPrefs(value: unknown): NotificationPrefs {
  if (typeof value !== "string") return DEFAULT_NOTIFICATION_PREFS;
  try {
    const parsed = JSON.parse(value);
    return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}
