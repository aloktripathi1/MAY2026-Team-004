import assert from "node:assert/strict";

import {
  formatIssueStatus,
  formatTaskStatus,
  formatTaskDue,
  pluralize,
  formatTimeAgo,
} from "../lib/format.ts";
import { DEFAULT_NOTIFICATION_PREFS, parseNotificationPrefs } from "../lib/notification-prefs.ts";
import { parseInterests } from "../lib/interests.ts";
import { normalizeEventTags, serializeEventTags } from "../lib/event-tags.ts";
import { getPrimaryClubMembership } from "../lib/session-helpers.ts";
import {
  buildEventSlug,
  decideJoinRequestAction,
  decideRsvpAction,
  EVENT_APPROVALS,
  MEMBERSHIP_STATUSES,
  normalizeEventApproval,
  normalizeMembershipStatus,
  normalizeTaskStatus,
  parseTagInput,
  requireClubAdminAccess,
  requireFacultyAccess,
  TASK_STATUSES,
} from "../lib/workflow-rules.ts";

type TestCase = {
  name: string;
  run: () => void;
};

const session = {
  user: {
    memberships: [
      { clubId: "c1", role: "Member" },
      { clubId: "c2", role: "Coordinator" },
      { clubId: "c3", role: "Volunteer" },
    ],
  },
} as any;

const adminMemberships = [
  { clubId: "c1", role: "Admin" },
  { clubId: "c2", role: "Coordinator" },
];

const tests: TestCase[] = [
  {
    name: "formatIssueStatus expands the in-progress label",
    run: () => {
      assert.equal(formatIssueStatus("InProgress"), "In progress");
      assert.equal(formatIssueStatus("Open"), "Open");
    },
  },
  {
    name: "formatTaskStatus maps known workflow statuses",
    run: () => {
      assert.equal(formatTaskStatus("todo"), "To do");
      assert.equal(formatTaskStatus("doing"), "In progress");
      assert.equal(formatTaskStatus("done"), "Done");
      assert.equal(formatTaskStatus("blocked"), "blocked");
    },
  },
  {
    name: "formatTaskDue handles missing and populated due dates",
    run: () => {
      assert.equal(formatTaskDue(null), "No due date");
      const due = new Date("2026-07-12T09:30:00Z");
      assert.match(formatTaskDue(due), /^Due \d{1,2} [A-Z][a-z]{2}, \d{1,2}:\d{2} (AM|PM)$/);
    },
  },
  {
    name: "pluralize returns the singular only for a count of one",
    run: () => {
      assert.equal(pluralize(1, "task"), "task");
      assert.equal(pluralize(0, "task"), "tasks");
      assert.equal(pluralize(2, "person", "people"), "people");
    },
  },
  {
    name: "formatTimeAgo chooses the correct display bucket",
    run: () => {
      const now = Date.now();
      assert.equal(formatTimeAgo(new Date(now - 30 * 1000)), "just now");
      assert.equal(formatTimeAgo(new Date(now - 5 * 60 * 1000)), "5m");
      assert.equal(formatTimeAgo(new Date(now - 2 * 60 * 60 * 1000)), "2h");
      assert.equal(formatTimeAgo(new Date(now - 3 * 24 * 60 * 60 * 1000)), "3d");
      assert.equal(formatTimeAgo(new Date(now - 14 * 24 * 60 * 60 * 1000)), "2w");
      assert.match(formatTimeAgo(new Date(now - 40 * 24 * 60 * 60 * 1000)), /^[A-Z][a-z]{2} \d{1,2}$/);
    },
  },
  {
    name: "parseNotificationPrefs falls back to defaults for invalid input",
    run: () => {
      assert.deepEqual(parseNotificationPrefs(undefined), DEFAULT_NOTIFICATION_PREFS);
      assert.deepEqual(parseNotificationPrefs("{invalid"), DEFAULT_NOTIFICATION_PREFS);
    },
  },
  {
    name: "parseNotificationPrefs merges partial persisted values with defaults",
    run: () => {
      assert.deepEqual(parseNotificationPrefs(JSON.stringify({ onlyMyClubs: false })), {
        onlyMyClubs: false,
        suggestedClubEvents: true,
        pinnedAnnouncementsOnly: false,
      });
    },
  },
  {
    name: "parseInterests returns only string values from stored JSON",
    run: () => {
      assert.deepEqual(parseInterests(undefined), []);
      assert.deepEqual(parseInterests(JSON.stringify(["Technical", 42, "Sports", null])), ["Technical", "Sports"]);
      assert.deepEqual(parseInterests(JSON.stringify({ interest: "Technical" })), []);
    },
  },
  {
    name: "normalizeEventTags trims whitespace and drops blanks",
    run: () => {
      assert.deepEqual(normalizeEventTags([" tech ", "", "music  "]), ["tech", "music"]);
      assert.deepEqual(normalizeEventTags(" tech, music , , debate "), ["tech", "music", "debate"]);
      assert.deepEqual(normalizeEventTags(null), []);
    },
  },
  {
    name: "serializeEventTags adapts to sqlite and non-sqlite database modes",
    run: () => {
      const originalDatabaseUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = "file:./dev.db";
      assert.equal(serializeEventTags(["tech", "music"]), "tech,music");
      process.env.DATABASE_URL = "postgresql://localhost:5432/sangam";
      assert.deepEqual(serializeEventTags(["tech", "music"]), ["tech", "music"]);
      process.env.DATABASE_URL = originalDatabaseUrl;
    },
  },
  {
    name: "getPrimaryClubMembership returns the preferred role when available",
    run: () => {
      assert.deepEqual(getPrimaryClubMembership(session, "Coordinator"), { clubId: "c2", role: "Coordinator" });
    },
  },
  {
    name: "getPrimaryClubMembership falls back to the first membership",
    run: () => {
      assert.deepEqual(getPrimaryClubMembership(session, "Admin"), { clubId: "c1", role: "Member" });
      assert.deepEqual(getPrimaryClubMembership(session), { clubId: "c1", role: "Member" });
    },
  },
  {
    name: "parseTagInput trims and filters tag lists",
    run: () => {
      assert.deepEqual(parseTagInput("tech, music , , debate"), ["tech", "music", "debate"]);
      assert.deepEqual(parseTagInput(""), []);
      assert.deepEqual(parseTagInput(undefined), []);
    },
  },
  {
    name: "parseTagInput returns an empty list for whitespace-only or all-comma input",
    run: () => {
      assert.deepEqual(parseTagInput("   "), []);
      assert.deepEqual(parseTagInput(",,,"), []);
      assert.deepEqual(parseTagInput(null), []);
    },
  },
  {
    name: "parseTagInput preserves duplicate tags without deduplicating",
    run: () => {
      assert.deepEqual(parseTagInput("tech, tech, music"), ["tech", "tech", "music"]);
    },
  },
  {
    name: "buildEventSlug creates a stable lowercase slug suffix",
    run: () => {
      assert.equal(buildEventSlug("Ignite 2026: Kickoff!", 1234567890), "ignite-2026-kickoff-kf12oi");
    },
  },
  {
    name: "buildEventSlug collapses punctuation runs into single hyphens",
    run: () => {
      assert.equal(buildEventSlug("Tech & Talk -- 2026", 0), "tech-talk-2026-0");
    },
  },
  {
    name: "buildEventSlug falls back to a bare timestamp suffix when the title has no alphanumerics",
    run: () => {
      assert.equal(buildEventSlug("!!!", 1234567890), "-kf12oi");
    },
  },
  {
    name: "decideJoinRequestAction creates a new request when none exists",
    run: () => {
      assert.equal(decideJoinRequestAction(undefined), "create");
    },
  },
  {
    name: "decideJoinRequestAction withdraws a pending request",
    run: () => {
      assert.equal(decideJoinRequestAction("Pending"), "withdraw");
    },
  },
  {
    name: "decideJoinRequestAction leaves active memberships untouched",
    run: () => {
      assert.equal(decideJoinRequestAction("Active"), "none");
    },
  },
  {
    name: "decideJoinRequestAction leaves rejected or inactive memberships untouched",
    run: () => {
      assert.equal(decideJoinRequestAction("Rejected"), "none");
      assert.equal(decideJoinRequestAction("Inactive"), "none");
    },
  },
  {
    name: "decideJoinRequestAction treats an empty status string as no existing request",
    run: () => {
      assert.equal(decideJoinRequestAction(""), "create");
      assert.equal(decideJoinRequestAction(null), "create");
    },
  },
  {
    name: "decideRsvpAction cancels existing registrations",
    run: () => {
      assert.equal(decideRsvpAction(true, null), "cancel");
    },
  },
  {
    name: "decideRsvpAction allows registration when spots remain",
    run: () => {
      assert.equal(decideRsvpAction(false, { status: "upcoming", capacity: 50, going: 20, rsvpCount: 18 }), "register");
    },
  },
  {
    name: "decideRsvpAction rejects full events based on displayed attendance",
    run: () => {
      assert.throws(
        () => decideRsvpAction(false, { status: "upcoming", capacity: 20, going: 20, rsvpCount: 18 }),
        /Registration unavailable/,
      );
    },
  },
  {
    name: "decideRsvpAction rejects full events based on RSVP count",
    run: () => {
      assert.throws(
        () => decideRsvpAction(false, { status: "upcoming", capacity: 20, going: 12, rsvpCount: 20 }),
        /Registration unavailable/,
      );
    },
  },
  {
    name: "decideRsvpAction rejects past events",
    run: () => {
      assert.throws(
        () => decideRsvpAction(false, { status: "past", capacity: 50, going: 10, rsvpCount: 10 }),
        /Registration unavailable/,
      );
    },
  },
  {
    name: "decideRsvpAction rejects missing events when creating a new RSVP",
    run: () => {
      assert.throws(() => decideRsvpAction(false, null), /Event not found/);
    },
  },
  {
    name: "decideRsvpAction allows registration for the very last remaining spot",
    run: () => {
      assert.equal(decideRsvpAction(false, { status: "upcoming", capacity: 20, going: 19, rsvpCount: 15 }), "register");
    },
  },
  {
    name: "decideRsvpAction treats a null going count as zero attendance",
    run: () => {
      assert.equal(decideRsvpAction(false, { status: "upcoming", capacity: 5, going: null, rsvpCount: 3 }), "register");
    },
  },
  {
    name: "decideRsvpAction rejects events with zero capacity",
    run: () => {
      assert.throws(
        () => decideRsvpAction(false, { status: "upcoming", capacity: 0, going: 0, rsvpCount: 0 }),
        /Registration unavailable/,
      );
    },
  },
  {
    name: "normalizeTaskStatus accepts valid task workflow states",
    run: () => {
      assert.equal(normalizeTaskStatus("todo"), "todo");
      assert.equal(normalizeTaskStatus("doing"), "doing");
      assert.equal(normalizeTaskStatus("done"), "done");
    },
  },
  {
    name: "normalizeTaskStatus rejects invalid task workflow states",
    run: () => {
      assert.throws(() => normalizeTaskStatus("blocked"), /Invalid task status/);
      assert.throws(() => normalizeTaskStatus(""), /Invalid task status/);
    },
  },
  {
    name: "normalizeMembershipStatus accepts valid approval states",
    run: () => {
      assert.equal(normalizeMembershipStatus("Active"), "Active");
      assert.equal(normalizeMembershipStatus("Inactive"), "Inactive");
    },
  },
  {
    name: "normalizeMembershipStatus rejects invalid approval states",
    run: () => {
      assert.throws(() => normalizeMembershipStatus("Pending"), /Invalid membership status/);
    },
  },
  {
    name: "normalizeEventApproval accepts valid event approvals",
    run: () => {
      assert.equal(normalizeEventApproval("approved"), "approved");
      assert.equal(normalizeEventApproval("pending"), "pending");
      assert.equal(normalizeEventApproval("rejected"), "rejected");
    },
  },
  {
    name: "normalizeEventApproval rejects invalid event approvals",
    run: () => {
      assert.throws(() => normalizeEventApproval("draft"), /Invalid approval status/);
    },
  },
  {
    name: "workflow status constants expose exactly the expected allowed values",
    run: () => {
      assert.deepEqual(TASK_STATUSES, ["todo", "doing", "done"]);
      assert.deepEqual(MEMBERSHIP_STATUSES, ["Active", "Inactive"]);
      assert.deepEqual(EVENT_APPROVALS, ["approved", "pending", "rejected"]);
    },
  },
  {
    name: "requireClubAdminAccess allows the matching club admin",
    run: () => {
      assert.doesNotThrow(() => requireClubAdminAccess(adminMemberships, "c1"));
    },
  },
  {
    name: "requireClubAdminAccess rejects users without admin rights for that club",
    run: () => {
      assert.throws(() => requireClubAdminAccess(adminMemberships, "c2"), /Not authorized for this club/);
    },
  },
  {
    name: "requireClubAdminAccess rejects when the user has no memberships at all",
    run: () => {
      assert.throws(() => requireClubAdminAccess([], "c1"), /Not authorized for this club/);
    },
  },
  {
    name: "requireFacultyAccess allows faculty users",
    run: () => {
      assert.doesNotThrow(() => requireFacultyAccess(true));
    },
  },
  {
    name: "requireFacultyAccess rejects non-faculty users",
    run: () => {
      assert.throws(() => requireFacultyAccess(false), /Faculty only/);
    },
  },
];

let passed = 0;

for (const testCase of tests) {
  try {
    testCase.run();
    passed += 1;
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    console.error(`FAIL ${testCase.name}`);
    throw error;
  }
}

console.log(`\n${passed}/${tests.length} tests passed.`);
