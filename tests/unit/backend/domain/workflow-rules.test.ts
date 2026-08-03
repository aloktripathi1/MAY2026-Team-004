import {
  buildEventSlug,
  decideJoinRequestAction,
  decideCountMeInAction,
  isEventPast,
  EVENT_APPROVALS,
  MEMBERSHIP_STATUSES,
  normalizeEventApproval,
  normalizeMembershipStatus,
  normalizeTaskStatus,
  parseTagInput,
  requireClubAdminAccess,
  requireFacultyAccess,
  TASK_STATUSES,
} from "@/backend/domain/workflow-rules";

const adminMemberships = [
  { clubId: "c1", role: "Admin" },
  { clubId: "c2", role: "Coordinator" },
];

describe("parseTagInput", () => {
  it("trims and filters tag lists", () => {
    expect(parseTagInput("tech, music , , debate")).toEqual(["tech", "music", "debate"]);
    expect(parseTagInput("")).toEqual([]);
    expect(parseTagInput(undefined)).toEqual([]);
  });

  it("returns an empty list for whitespace-only or all-comma input", () => {
    expect(parseTagInput("   ")).toEqual([]);
    expect(parseTagInput(",,,")).toEqual([]);
    expect(parseTagInput(null)).toEqual([]);
  });

  it("preserves duplicate tags without deduplicating", () => {
    expect(parseTagInput("tech, tech, music")).toEqual(["tech", "tech", "music"]);
  });
});

describe("buildEventSlug", () => {
  it("creates a stable lowercase slug suffix", () => {
    expect(buildEventSlug("Ignite 2026: Kickoff!", 1234567890)).toBe("ignite-2026-kickoff-kf12oi");
  });

  it("collapses punctuation runs into single hyphens", () => {
    expect(buildEventSlug("Tech & Talk -- 2026", 0)).toBe("tech-talk-2026-0");
  });

  it("uses a safe fallback when the title has no alphanumerics", () => {
    expect(buildEventSlug("!!!", 1234567890)).toBe("event-kf12oi");
  });
});

describe("decideJoinRequestAction", () => {
  it("creates a new request when none exists", () => {
    expect(decideJoinRequestAction(undefined)).toBe("create");
  });

  it("withdraws a pending request", () => {
    expect(decideJoinRequestAction("Pending")).toBe("withdraw");
  });

  it("leaves active memberships untouched", () => {
    expect(decideJoinRequestAction("Active")).toBe("none");
  });

  it("leaves rejected or inactive memberships untouched", () => {
    expect(decideJoinRequestAction("Rejected")).toBe("none");
    expect(decideJoinRequestAction("Inactive")).toBe("none");
  });

  it("treats an empty status string as no existing request", () => {
    expect(decideJoinRequestAction("")).toBe("create");
    expect(decideJoinRequestAction(null)).toBe("create");
  });
});

describe("decideCountMeInAction", () => {
  it("cancels existing registrations", () => {
    expect(decideCountMeInAction(true, null)).toBe("cancel");
  });

  it("allows registration when spots remain", () => {
    expect(decideCountMeInAction(false, { status: "upcoming", capacity: 50, countMeInCount: 18, approval: "approved" })).toBe("register");
  });

  it("ignores the legacy promotional going count when live registrations have space", () => {
    const event = { status: "upcoming", capacity: 20, going: 20, countMeInCount: 18, approval: "approved" };
    expect(decideCountMeInAction(false, event)).toBe("register");
  });

  it("rejects full events based on Count Me In count", () => {
    expect(() =>
      decideCountMeInAction(false, { status: "upcoming", capacity: 20, countMeInCount: 20, approval: "approved" }),
    ).toThrow(/Registration unavailable/);
  });

  it("rejects past events", () => {
    expect(() =>
      decideCountMeInAction(false, { status: "past", capacity: 50, countMeInCount: 10, approval: "approved" }),
    ).toThrow(/Registration unavailable/);
  });

  it("rejects missing events when creating a new Count Me In", () => {
    expect(() => decideCountMeInAction(false, null)).toThrow(/Event not found/);
  });

  it("allows registration for the very last remaining spot", () => {
    expect(decideCountMeInAction(false, { status: "upcoming", capacity: 20, countMeInCount: 19, approval: "approved" })).toBe("register");
  });

  it("treats zero CountMeIn rows as no attendance", () => {
    expect(decideCountMeInAction(false, { status: "upcoming", capacity: 5, countMeInCount: 0, approval: "approved" })).toBe("register");
  });

  it("rejects events with zero capacity", () => {
    expect(() =>
      decideCountMeInAction(false, { status: "upcoming", capacity: 0, countMeInCount: 0, approval: "approved" }),
    ).toThrow(/Registration unavailable/);
  });

  it("allows registration for events that never required approval", () => {
    expect(decideCountMeInAction(false, { status: "upcoming", capacity: 20, countMeInCount: 0, approval: "notRequired" })).toBe("register");
  });

  it("rejects registration while approval is still pending", () => {
    expect(() =>
      decideCountMeInAction(false, { status: "upcoming", capacity: 20, countMeInCount: 0, approval: "pending" }),
    ).toThrow(/opens once this event is approved/);
  });

  it("rejects registration once an event has been rejected", () => {
    expect(() =>
      decideCountMeInAction(false, { status: "upcoming", capacity: 20, countMeInCount: 0, approval: "rejected" }),
    ).toThrow(/opens once this event is approved/);
  });

  it("still allows cancelling an existing registration even if approval later changes", () => {
    expect(decideCountMeInAction(true, { status: "upcoming", capacity: 20, countMeInCount: 5, approval: "pending" })).toBe("cancel");
  });

  it("rejects a stale 'upcoming' status once the event date has passed", () => {
    expect(() =>
      decideCountMeInAction(false, {
        status: "upcoming",
        capacity: 50,
        countMeInCount: 10,
        approval: "approved",
        date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      }),
    ).toThrow(/Registration unavailable/);
  });
});

describe("isEventPast", () => {
  it("treats a stored status of past as past regardless of date", () => {
    expect(isEventPast({ status: "past", date: new Date(Date.now() + 24 * 60 * 60 * 1000) })).toBe(true);
  });

  it("derives past from the date even when status is stale", () => {
    expect(isEventPast({ status: "upcoming", date: new Date(Date.now() - 24 * 60 * 60 * 1000) })).toBe(true);
  });

  it("treats a future date as not past", () => {
    expect(isEventPast({ status: "upcoming", date: new Date(Date.now() + 24 * 60 * 60 * 1000) })).toBe(false);
  });

  it("treats a missing date as not past when status is upcoming", () => {
    expect(isEventPast({ status: "upcoming" })).toBe(false);
  });
});

describe("normalizeTaskStatus", () => {
  it("accepts valid task workflow states", () => {
    expect(normalizeTaskStatus("todo")).toBe("todo");
    expect(normalizeTaskStatus("doing")).toBe("doing");
    expect(normalizeTaskStatus("done")).toBe("done");
  });

  it("rejects invalid task workflow states", () => {
    expect(() => normalizeTaskStatus("blocked")).toThrow(/Invalid task status/);
    expect(() => normalizeTaskStatus("")).toThrow(/Invalid task status/);
  });
});

describe("normalizeMembershipStatus", () => {
  it("accepts valid approval states", () => {
    expect(normalizeMembershipStatus("Active")).toBe("Active");
    expect(normalizeMembershipStatus("Inactive")).toBe("Inactive");
    expect(normalizeMembershipStatus("Pending")).toBe("Pending");
  });

  it("rejects invalid approval states", () => {
    expect(() => normalizeMembershipStatus("Unknown")).toThrow(/Invalid membership status/);
  });
});

describe("normalizeEventApproval", () => {
  it("accepts valid event approvals", () => {
    expect(normalizeEventApproval("approved")).toBe("approved");
    expect(normalizeEventApproval("pending")).toBe("pending");
    expect(normalizeEventApproval("rejected")).toBe("rejected");
  });

  it("rejects invalid event approvals", () => {
    expect(() => normalizeEventApproval("draft")).toThrow(/Invalid approval status/);
  });
});

describe("workflow status constants", () => {
  it("expose exactly the expected allowed values", () => {
    expect(TASK_STATUSES).toEqual(["todo", "doing", "done"]);
    expect(MEMBERSHIP_STATUSES).toEqual(["Pending", "Active", "Inactive"]);
    expect(EVENT_APPROVALS).toEqual(["approved", "pending", "rejected"]);
  });
});

describe("requireClubAdminAccess", () => {
  it("allows the matching club admin", () => {
    expect(() => requireClubAdminAccess(adminMemberships, "c1")).not.toThrow();
  });

  it("rejects users without admin rights for that club", () => {
    expect(() => requireClubAdminAccess(adminMemberships, "c2")).toThrow(/Not authorized for this club/);
  });

  it("rejects when the user has no memberships at all", () => {
    expect(() => requireClubAdminAccess([], "c1")).toThrow(/Not authorized for this club/);
  });
});

describe("requireFacultyAccess", () => {
  it("allows faculty users", () => {
    expect(() => requireFacultyAccess(true)).not.toThrow();
  });

  it("rejects non-faculty users", () => {
    expect(() => requireFacultyAccess(false)).toThrow(/Faculty only/);
  });
});
