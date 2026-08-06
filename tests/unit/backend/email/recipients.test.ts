import { AUDIENCE_ROLES, dedupeRecipients, excludeUser } from "@/backend/email/recipients";
import type { Recipient } from "@/backend/email/recipients";

function recipient(userId: string, email = `${userId}@ds.study.iitm.ac.in`): Recipient {
  return { userId, email, name: userId, prefsJson: "{}", role: "Member" };
}

describe("AUDIENCE_ROLES", () => {
  it("mails every active member for the All audience", () => {
    expect(AUDIENCE_ROLES.All).toEqual(["Member", "Volunteer", "Coordinator", "Admin"]);
  });

  // A "Volunteers" announcement should also reach the people responsible for
  // volunteers, otherwise the coordinator who posted it never sees it land.
  it("includes higher tiers in a targeted audience", () => {
    expect(AUDIENCE_ROLES.Coordinators).toContain("Admin");
    expect(AUDIENCE_ROLES.Volunteers).toEqual(expect.arrayContaining(["Volunteer", "Coordinator", "Admin"]));
  });

  it("does not send plain members a coordinators-only announcement", () => {
    expect(AUDIENCE_ROLES.Coordinators).not.toContain("Member");
    expect(AUDIENCE_ROLES.Volunteers).not.toContain("Member");
  });
});

describe("dedupeRecipients", () => {
  it("keeps one entry per person", () => {
    const list = [recipient("a"), recipient("b"), recipient("a")];
    expect(dedupeRecipients(list).map((r) => r.userId)).toEqual(["a", "b"]);
  });

  it("falls back to the email when there is no user id", () => {
    const list: Recipient[] = [
      { ...recipient("", "x@y.com"), userId: "" },
      { ...recipient("", "X@Y.com"), userId: "" },
    ];
    expect(dedupeRecipients(list)).toHaveLength(1);
  });
});

describe("excludeUser", () => {
  it("drops the actor who caused the notification", () => {
    const list = [recipient("a"), recipient("b")];
    expect(excludeUser(list, "a").map((r) => r.userId)).toEqual(["b"]);
  });

  it("is a no-op without a user id", () => {
    const list = [recipient("a")];
    expect(excludeUser(list, null)).toHaveLength(1);
    expect(excludeUser(list, undefined)).toHaveLength(1);
  });
});
