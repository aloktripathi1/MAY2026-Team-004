import {
  DEFAULT_NOTIFICATION_PREFS,
  EMAIL_PREF_KEYS,
  parseNotificationPrefs,
  wantsEmail,
} from "@/lib/notification-prefs";

describe("parseNotificationPrefs", () => {
  it("falls back to defaults for invalid input", () => {
    expect(parseNotificationPrefs(undefined)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs("{invalid")).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it("merges partial persisted values with defaults", () => {
    expect(parseNotificationPrefs(JSON.stringify({ onlyMyClubs: false }))).toEqual({
      ...DEFAULT_NOTIFICATION_PREFS,
      onlyMyClubs: false,
    });
  });

  // Rows written before the email keys existed must not read as opted out —
  // that would silently mute every existing account.
  it("treats rows saved before email prefs existed as opted in", () => {
    const legacy = JSON.stringify({
      onlyMyClubs: true,
      suggestedClubEvents: true,
      pinnedAnnouncementsOnly: false,
    });
    const prefs = parseNotificationPrefs(legacy);

    for (const key of Object.values(EMAIL_PREF_KEYS)) {
      expect(prefs[key]).toBe(true);
    }
  });

  it("ignores unknown keys and non-boolean values", () => {
    const parsed = parseNotificationPrefs(
      JSON.stringify({ emailEvents: "nope", injected: true, onlyMyClubs: false }),
    );
    expect(parsed.emailEvents).toBe(true); // default, not the string
    expect(parsed.onlyMyClubs).toBe(false);
    expect(parsed).not.toHaveProperty("injected");
  });

  it("rejects JSON that isn't an object", () => {
    expect(parseNotificationPrefs("null")).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs("[1,2]")).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs('"a string"')).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });
});

describe("wantsEmail", () => {
  it("reads the category's flag", () => {
    const prefs = JSON.stringify({ emailEvents: false, emailTasks: true });
    expect(wantsEmail(prefs, "events")).toBe(false);
    expect(wantsEmail(prefs, "tasks")).toBe(true);
  });

  it("defaults to opted in when prefs are missing", () => {
    expect(wantsEmail(undefined, "announcements")).toBe(true);
  });
});
