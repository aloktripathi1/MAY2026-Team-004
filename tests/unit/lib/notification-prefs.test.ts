import { DEFAULT_NOTIFICATION_PREFS, parseNotificationPrefs } from "@/lib/notification-prefs";

describe("parseNotificationPrefs", () => {
  it("falls back to defaults for invalid input", () => {
    expect(parseNotificationPrefs(undefined)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs("{invalid")).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it("merges partial persisted values with defaults", () => {
    expect(parseNotificationPrefs(JSON.stringify({ onlyMyClubs: false }))).toEqual({
      onlyMyClubs: false,
      suggestedClubEvents: true,
      pinnedAnnouncementsOnly: false,
    });
  });
});
