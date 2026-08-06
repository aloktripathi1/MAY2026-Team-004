/**
 * Integration tests for email notifications (#113).
 *
 * These run against the real database and the real mailer, in dry-run: EMAIL_ENABLED
 * is off for tests, so every send is decided, recorded in EmailLog and logged —
 * but nothing leaves the app. That's the point. The seeded accounts are real
 * IITM addresses, and a suite that actually mailed them would be a bug worse
 * than anything it could catch.
 *
 * Requires a running Sangam app + seeded database:
 *   npm run db:up && npm run db:push && npm run db:seed && npm run dev
 *   npm run test:integration
 */
import { readFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/backend/db/prisma";
import { sendEmail } from "@/backend/email/client";
import {
  notifyAnnouncement,
  notifyEventScheduleChange,
  notifyIssueSubmitted,
  notifyMembershipApplied,
  notifyMembershipDecision,
  notifyRegistrationConfirmed,
  notifyTaskAssigned,
} from "@/backend/email/notifications";
import { runAnnouncementDigest, runEventReminders, runTaskDueReminders } from "@/backend/email/scheduled";
import { clubRecipients } from "@/backend/email/recipients";
import * as templates from "@/backend/email/templates";
import { createUnsubscribeToken } from "@/backend/email/unsubscribe";
import { consumeVerificationToken, createVerificationToken } from "@/backend/auth/email-verification";
import { parseNotificationPrefs } from "@/lib/notification-prefs";
import { deleteEventsByIds, deleteUsersByEmails } from "./db-cleanup";
import {
  ApiClient,
  CLUB_IDS,
  isApiAvailable,
  reportCase,
  requireApiAvailable,
  SEEDED_ACCOUNTS,
  uniqueIdentity,
} from "./helpers";

const CRON_PATH = "/api/cron/email";
const UNSUBSCRIBE_PATH = "/api/email/unsubscribe";

const createdEmails: string[] = [];
const createdEventIds: string[] = [];
const createdUserIds: string[] = [];
const dedupeKeys: string[] = [];

let client: ApiClient;

/** A throwaway user, so tests never mutate a seeded team member's prefs. */
async function makeUser(overrides: { notificationPrefs?: string } = {}) {
  const identity = uniqueIdentity("23e");
  const user = await prisma.user.create({
    data: {
      email: identity.email,
      name: identity.name,
      rollNumber: identity.rollNumber,
      hashedPassword: "",
      interests: "[]",
      ...(overrides.notificationPrefs ? { notificationPrefs: overrides.notificationPrefs } : {}),
    },
  });
  createdEmails.push(user.email);
  createdUserIds.push(user.id);
  return user;
}

function rendered() {
  return templates.welcome({
    name: "Test",
    clubName: "CodeChef",
    appUrl: "http://localhost:3000/app",
    manageUrl: "http://localhost:3000/app/profile",
  });
}

/** Tracks a key so afterAll can clear the EmailLog rows this suite created. */
function key(suffix: string): string {
  const value = `jest:${suffix}:${Math.random().toString(36).slice(2, 10)}`;
  dedupeKeys.push(value);
  return value;
}

beforeAll(async () => {
  requireApiAvailable(await isApiAvailable());
});

beforeEach(() => {
  client = new ApiClient();
});

afterAll(async () => {
  // Dedupe keys are mangled to `failed:<id>:<key>` on send failure, so match on
  // contains rather than equality.
  for (const value of dedupeKeys) {
    await prisma.emailLog.deleteMany({ where: { dedupeKey: { contains: value } } });
  }
  if (createdUserIds.length > 0) {
    await prisma.emailLog.deleteMany({ where: { userId: { in: createdUserIds } } });
  }
  if (createdEventIds.length > 0) {
    await deleteEventsByIds(createdEventIds);
  }
  if (createdEmails.length > 0) {
    const deleted = await deleteUsersByEmails(createdEmails);
    console.log(`\n[cleanup] deleted ${deleted} test user(s)`);
  }
});

describe("sendEmail", () => {
  it("records a dry-run send instead of delivering it", async () => {
    const user = await makeUser();
    const dedupeKey = key("dryrun");

    const result = await sendEmail({
      to: user.email,
      userId: user.id,
      prefsJson: user.notificationPrefs,
      template: "welcome",
      rendered: rendered(),
      dedupeKey,
    });

    const log = await prisma.emailLog.findUnique({ where: { dedupeKey } });

    reportCase(
      "sendEmail (dry-run)",
      { to: user.email, template: "welcome" },
      { status: "dryRun", logged: true },
      { status: result.status, logged: Boolean(log) },
      () => {
        expect(result.status).toBe("dryRun");
        expect(log?.status).toBe("dryRun");
        expect(log?.template).toBe("welcome");
        expect(log?.to).toBe(user.email);
      },
    );
  });

  // The property every scheduled sweep depends on.
  it("sends once for a repeated dedupe key", async () => {
    const user = await makeUser();
    const dedupeKey = key("idempotent");
    const input = {
      to: user.email,
      userId: user.id,
      prefsJson: user.notificationPrefs,
      template: "welcome" as const,
      rendered: rendered(),
      dedupeKey,
    };

    const first = await sendEmail(input);
    const second = await sendEmail(input);
    const third = await sendEmail(input);
    const rows = await prisma.emailLog.count({ where: { dedupeKey } });

    reportCase(
      "sendEmail idempotency",
      { dedupeKey, attempts: 3 },
      { first: "dryRun", repeats: "duplicate", rows: 1 },
      { first: first.status, repeats: `${second.status}/${third.status}`, rows },
      () => {
        expect(first.status).toBe("dryRun");
        expect(second.status).toBe("duplicate");
        expect(third.status).toBe("duplicate");
        expect(rows).toBe(1);
      },
    );
  });

  it("skips a recipient who opted out of the category", async () => {
    const user = await makeUser({
      notificationPrefs: JSON.stringify({ emailMembership: false }),
    });
    const dedupeKey = key("optout");

    const result = await sendEmail({
      to: user.email,
      userId: user.id,
      prefsJson: user.notificationPrefs,
      template: "welcome",
      rendered: rendered(), // category: membership
      dedupeKey,
    });
    const log = await prisma.emailLog.findUnique({ where: { dedupeKey } });

    reportCase(
      "sendEmail respects notificationPrefs",
      { emailMembership: false },
      { status: "skipped", logRow: null },
      { status: result.status, logRow: log },
      () => {
        expect(result.status).toBe("skipped");
        expect(result.reason).toContain("opted out");
        // No key claimed, so switching the pref back on works immediately.
        expect(log).toBeNull();
      },
    );
  });

  it("still delivers transactional mail to someone who opted out of everything", async () => {
    const user = await makeUser({
      notificationPrefs: JSON.stringify({
        emailAnnouncements: false,
        emailEvents: false,
        emailTasks: false,
        emailMembership: false,
        emailIssues: false,
      }),
    });
    const dedupeKey = key("transactional");

    const result = await sendEmail({
      to: user.email,
      userId: user.id,
      prefsJson: user.notificationPrefs,
      template: "verifyEmail",
      rendered: templates.verifyEmail({
        name: user.name,
        verifyUrl: "http://localhost:3000/api/auth/verify-email?token=x",
        manageUrl: "http://localhost:3000/app/profile",
        expiresInHours: 24,
      }),
      dedupeKey,
    });

    reportCase(
      "transactional mail ignores opt-outs",
      { allCategoriesOff: true, template: "verifyEmail" },
      { status: "dryRun" },
      { status: result.status },
      () => expect(result.status).toBe("dryRun"),
    );
  });

  it("refuses an address that isn't an address", async () => {
    const result = await sendEmail({
      to: "   ",
      template: "welcome",
      rendered: rendered(),
      dedupeKey: key("bad-address"),
    });
    expect(result.status).toBe("skipped");
    expect(result.reason).toContain("invalid recipient");
  });
});

describe("notification triggers", () => {
  /**
   * Guards the bug where only one of the two registration paths mailed.
   * `POST /api/events/[id]/register` went through registerForEvent, while the
   * "Count Me In" button went through toggleCountMeInAction and sent nothing —
   * so a member clicking the button in the app got silence. Server Actions
   * aren't reachable over HTTP, so this asserts the structural invariant
   * instead: every module that creates a CountMeIn row must also trigger the
   * confirmation.
   */
  it("sends a confirmation from every code path that registers someone", async () => {
    const modules = ["backend/domain/countMeIn.ts", "backend/domain/events.ts"];
    const missing: string[] = [];

    for (const relative of modules) {
      const source = await readFile(join(process.cwd(), relative), "utf8");
      if (source.includes("countMeIn.create") && !source.includes("notifyRegistrationConfirmed")) {
        missing.push(relative);
      }
    }

    reportCase(
      "every registration path notifies",
      { modules },
      { pathsMissingTheEmail: [] },
      { pathsMissingTheEmail: missing },
      () => expect(missing).toEqual([]),
    );
  });

  it("confirms to the applicant and alerts the club's admins", async () => {
    const user = await makeUser();
    const summary = await notifyMembershipApplied(user.id, CLUB_IDS.codechef);

    const applicantLog = await prisma.emailLog.findFirst({
      where: { userId: user.id, template: "membershipApplicationReceived" },
    });
    const adminLogs = await prisma.emailLog.count({
      where: { template: "membershipRequestAwaitingApproval", dedupeKey: { contains: user.id } },
    });
    dedupeKeys.push(user.id);

    reportCase(
      "notifyMembershipApplied",
      { userId: user.id, clubId: CLUB_IDS.codechef },
      { applicantEmailed: true, adminsEmailed: ">=1" },
      { applicantEmailed: Boolean(applicantLog), adminsEmailed: adminLogs },
      () => {
        expect(applicantLog).not.toBeNull();
        expect(adminLogs).toBeGreaterThanOrEqual(1);
        expect(summary.dryRun).toBeGreaterThanOrEqual(2);
      },
    );
  });

  it("sends approval and a one-time welcome on a first membership", async () => {
    const user = await makeUser();
    const membership = await prisma.membership.create({
      data: { userId: user.id, clubId: CLUB_IDS.paradox, role: "Member", status: "Active" },
    });

    await notifyMembershipDecision(membership.id, "Active");
    const templatesSent = await prisma.emailLog.findMany({
      where: { userId: user.id },
      select: { template: true },
    });

    // A second club must not trigger a second welcome.
    const second = await prisma.membership.create({
      data: { userId: user.id, clubId: CLUB_IDS.sarga, role: "Member", status: "Active" },
    });
    await notifyMembershipDecision(second.id, "Active");
    const welcomes = await prisma.emailLog.count({ where: { userId: user.id, template: "welcome" } });

    reportCase(
      "notifyMembershipDecision",
      { first: "Active", second: "Active" },
      { firstBatch: ["membershipApproved", "welcome"], totalWelcomes: 1 },
      { firstBatch: templatesSent.map((t) => t.template), totalWelcomes: welcomes },
      () => {
        expect(templatesSent.map((t) => t.template)).toEqual(
          expect.arrayContaining(["membershipApproved", "welcome"]),
        );
        expect(welcomes).toBe(1);
      },
    );
  });

  it("mails a High-priority announcement and leaves Low for the digest", async () => {
    const club = CLUB_IDS.codechef;
    const author = (await clubRecipients(club, "Coordinators"))[0];
    expect(author).toBeDefined();

    const high = await prisma.announcement.create({
      data: {
        title: "Jest: high priority",
        body: "Immediate.",
        clubId: club,
        authorId: author.userId,
        audience: "All",
        priority: "High",
      },
    });
    const low = await prisma.announcement.create({
      data: {
        title: "Jest: low priority",
        body: "Digest only.",
        clubId: club,
        authorId: author.userId,
        audience: "All",
        priority: "Low",
      },
    });

    const highSummary = await notifyAnnouncement(high.id);
    const lowSummary = await notifyAnnouncement(low.id);
    dedupeKeys.push(high.id, low.id);

    await prisma.announcement.deleteMany({ where: { id: { in: [high.id, low.id] } } });

    reportCase(
      "notifyAnnouncement priority routing",
      { high: "High", low: "Low" },
      { highSent: ">0", lowSent: 0 },
      { highSent: highSummary.dryRun, lowSent: lowSummary.dryRun },
      () => {
        expect(highSummary.dryRun).toBeGreaterThan(0);
        expect(lowSummary.dryRun).toBe(0);
      },
    );
  });

  it("narrows a Coordinators announcement to coordinators and admins", async () => {
    const all = await clubRecipients(CLUB_IDS.codechef, "All");
    const coordinators = await clubRecipients(CLUB_IDS.codechef, "Coordinators");
    const volunteers = await clubRecipients(CLUB_IDS.codechef, "Volunteers");

    reportCase(
      "announcement audience resolution",
      { clubId: CLUB_IDS.codechef },
      { allIsLargest: true, coordinatorsExcludeMembers: true },
      {
        all: all.length,
        coordinators: coordinators.length,
        volunteers: volunteers.length,
      },
      () => {
        expect(all.length).toBeGreaterThanOrEqual(coordinators.length);
        expect(coordinators.every((r) => r.role === "Coordinator" || r.role === "Admin")).toBe(true);
        expect(volunteers.every((r) => r.role !== "Member")).toBe(true);
      },
    );
  });

  it("only mails registrants when the schedule actually moved", async () => {
    const event = await prisma.event.create({
      data: {
        slug: `jest-schedule-${Date.now()}`,
        title: "Jest Schedule Event",
        clubId: CLUB_IDS.sarga,
        date: new Date(Date.now() + 7 * 86_400_000),
        time: "18:00",
        venue: "Amphitheatre",
        capacity: 50,
        cover: "linear-gradient(135deg,#7c3aed,#ec4899)",
        tags: [],
        description: "Created by the Jest email suite.",
        status: "upcoming",
        approval: "approved",
      },
    });
    createdEventIds.push(event.id);

    const user = await makeUser();
    await prisma.countMeIn.create({ data: { userId: user.id, eventId: event.id } });

    const noChange = await notifyEventScheduleChange(event.id, []);
    const changed = await notifyEventScheduleChange(event.id, [
      { label: "Venue", from: "Amphitheatre", to: "Main Hall" },
    ]);
    dedupeKeys.push(event.id);

    reportCase(
      "notifyEventScheduleChange",
      { emptyChangeSet: true, thenOneChange: true },
      { emptySends: 0, changedSends: ">=1" },
      { emptySends: noChange.dryRun, changedSends: changed.dryRun },
      () => {
        expect(noChange.dryRun).toBe(0);
        expect(changed.dryRun).toBeGreaterThanOrEqual(1);
      },
    );
  });

  it("confirms an event registration and a raised issue", async () => {
    const user = await makeUser();
    const event = await prisma.event.findFirstOrThrow({ where: { clubId: CLUB_IDS.sarga } });

    const registration = await notifyRegistrationConfirmed(user.id, event.id);

    const issue = await prisma.issue.create({
      data: { title: "Jest: cannot register", category: "Registration", raisedById: user.id, clubId: CLUB_IDS.sarga },
    });
    const issueResult = await notifyIssueSubmitted(issue.id);
    dedupeKeys.push(issue.id, event.id);
    await prisma.issue.delete({ where: { id: issue.id } });

    expect(registration.status).toBe("dryRun");
    expect(issueResult.status).toBe("dryRun");
  });

  it("tells a volunteer about a new task", async () => {
    const user = await makeUser();
    const event = await prisma.event.findFirstOrThrow({ where: { clubId: CLUB_IDS.sarga } });
    const task = await prisma.task.create({
      data: { title: "Jest: sound desk", eventId: event.id, role: "Sound", assigneeId: user.id, status: "todo" },
    });

    const result = await notifyTaskAssigned(task.id);
    dedupeKeys.push(task.id);
    await prisma.task.delete({ where: { id: task.id } });

    expect(result.status).toBe("dryRun");
  });
});

describe("scheduled sweeps", () => {
  it("reminds tomorrow's registrants exactly once", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);

    const event = await prisma.event.create({
      data: {
        slug: `jest-reminder-${Date.now()}`,
        title: "Jest Reminder Event",
        clubId: CLUB_IDS.sarga,
        date: tomorrow,
        time: "18:00",
        venue: "Amphitheatre",
        capacity: 50,
        cover: "linear-gradient(135deg,#7c3aed,#ec4899)",
        tags: [],
        description: "Created by the Jest email suite.",
        status: "upcoming",
        approval: "approved",
      },
    });
    createdEventIds.push(event.id);
    dedupeKeys.push(event.id);

    const user = await makeUser();
    await prisma.countMeIn.create({ data: { userId: user.id, eventId: event.id } });

    const first = await runEventReminders();
    const second = await runEventReminders();

    const mine = await prisma.emailLog.count({
      where: { userId: user.id, template: "eventReminder" },
    });

    reportCase(
      "runEventReminders idempotency",
      { eventDate: tomorrow.toISOString(), runs: 2 },
      { rowsForUser: 1, secondRunAllDuplicates: true },
      { rowsForUser: mine, firstRun: first, secondRun: second },
      () => {
        expect(mine).toBe(1);
        expect(second.dryRun).toBe(0);
        expect(second.duplicate).toBeGreaterThanOrEqual(1);
      },
    );
  });

  it("reminds an assignee about a task due tomorrow", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

    const user = await makeUser();
    const event = await prisma.event.findFirstOrThrow({ where: { clubId: CLUB_IDS.sarga } });
    const task = await prisma.task.create({
      data: {
        title: "Jest: due tomorrow",
        eventId: event.id,
        role: "Sound",
        assigneeId: user.id,
        status: "todo",
        dueAt: tomorrow,
      },
    });
    dedupeKeys.push(task.id);

    await runTaskDueReminders();
    const rows = await prisma.emailLog.count({
      where: { userId: user.id, template: "taskDueReminder" },
    });
    await prisma.task.delete({ where: { id: task.id } });

    expect(rows).toBe(1);
  });

  it("collapses a day's Low/Med announcements into one digest per person", async () => {
    const author = (await clubRecipients(CLUB_IDS.codechef, "Coordinators"))[0];
    const created = await prisma.$transaction([
      prisma.announcement.create({
        data: { title: "Jest digest A", body: "A", clubId: CLUB_IDS.codechef, authorId: author.userId, priority: "Low" },
      }),
      prisma.announcement.create({
        data: { title: "Jest digest B", body: "B", clubId: CLUB_IDS.codechef, authorId: author.userId, priority: "Med" },
      }),
    ]);

    const summary = await runAnnouncementDigest();
    const perRecipient = await prisma.emailLog.groupBy({
      by: ["to"],
      where: { template: "announcementDigest" },
      _count: { to: true },
    });

    await prisma.announcement.deleteMany({ where: { id: { in: created.map((a) => a.id) } } });
    await prisma.emailLog.deleteMany({ where: { template: "announcementDigest" } });

    reportCase(
      "runAnnouncementDigest",
      { lowAndMedAnnouncements: 2 },
      { oneDigestPerRecipient: true },
      { candidates: summary.candidates, maxPerRecipient: Math.max(0, ...perRecipient.map((r) => r._count.to)) },
      () => {
        expect(summary.candidates).toBeGreaterThan(0);
        for (const row of perRecipient) expect(row._count.to).toBe(1);
      },
    );
  });
});

describe("email verification gate", () => {
  /**
   * The gate is env-driven and the app under test runs in its own process, so
   * these assert the two halves that must hold regardless of the flag:
   * every account can be verified, and no account is left unverifiable.
   */
  it("leaves no seeded login unable to sign in once the gate is enabled", async () => {
    // Scoped to the seeded accounts on purpose: this suite creates its own
    // unverified throwaway users, so a global count would always fail. These
    // are the logins that must survive the flag being switched on.
    const emails = Object.values(SEEDED_ACCOUNTS).map((a) => a.email);
    const rows = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, emailVerified: true },
    });
    const unverified = rows.filter((r) => !r.emailVerified).map((r) => r.email);

    reportCase(
      "seeded accounts are verified",
      { accounts: emails },
      { found: emails.length, unverified: [] },
      { found: rows.length, unverified },
      () => {
        expect(rows).toHaveLength(emails.length);
        expect(unverified).toEqual([]);
      },
    );
  });

  it("re-issues a link without revealing whether the account exists", async () => {
    const user = await makeUser();

    const known = await client.post("/api/auth/resend-verification", { email: user.email });
    const unknown = await client.post("/api/auth/resend-verification", {
      email: "definitely-nobody@ds.study.iitm.ac.in",
    });

    reportCase(
      "POST /api/auth/resend-verification",
      { known: user.email, unknown: "definitely-nobody@ds.study.iitm.ac.in" },
      { bothStatuses: 200, bothBodiesIdentical: true },
      { known: known.status, unknown: unknown.status },
      () => {
        expect(known.status).toBe(200);
        expect(unknown.status).toBe(200);
        // Identical bodies: no enumeration oracle.
        expect(known.body.data.message).toBe(unknown.body.data.message);
      },
    );
  });

  it("rejects a malformed address", async () => {
    const res = await client.post("/api/auth/resend-verification", { email: "not-an-email" });
    expect(res.status).toBe(400);
  });
});

describe("email verification", () => {
  it("verifies once and refuses a replay", async () => {
    const user = await makeUser();
    const token = await createVerificationToken(user.id);

    const first = await consumeVerificationToken(token);
    const replay = await consumeVerificationToken(token);
    const stored = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerified: true },
    });

    reportCase(
      "consumeVerificationToken",
      { token: "<issued>", attempts: 2 },
      { first: "ok", replay: "USED", emailVerifiedSet: true },
      { first: first.ok, replay: replay.ok ? "ok" : replay.code, emailVerifiedSet: Boolean(stored?.emailVerified) },
      () => {
        expect(first.ok).toBe(true);
        expect(replay.ok).toBe(false);
        expect(stored?.emailVerified).toBeInstanceOf(Date);
      },
    );
  });

  it("rejects a forged token", async () => {
    const result = await consumeVerificationToken("not-a-real-token");
    expect(result.ok).toBe(false);
  });

  it("retires the previous link when a new one is issued", async () => {
    const user = await makeUser();
    const first = await createVerificationToken(user.id);
    const second = await createVerificationToken(user.id);

    expect((await consumeVerificationToken(first)).ok).toBe(false);
    expect((await consumeVerificationToken(second)).ok).toBe(true);
  });

  it("mails a verification link on signup through the REST route", async () => {
    const identity = uniqueIdentity("23v");
    createdEmails.push(identity.email);

    const res = await client.post("/api/auth/signup", identity);
    const user = await prisma.user.findUnique({ where: { email: identity.email } });
    if (user) createdUserIds.push(user.id);

    const log = await prisma.emailLog.findFirst({
      where: { userId: user?.id, template: "verifyEmail" },
    });

    reportCase(
      "POST /api/auth/signup sends verification",
      { email: identity.email },
      { status: 201, verificationEmailLogged: true },
      { status: res.status, verificationEmailLogged: Boolean(log) },
      () => {
        expect(res.status).toBe(201);
        expect(log).not.toBeNull();
      },
    );
  });
});

describe("unsubscribe endpoint", () => {
  it("turns a category off on POST but not on GET", async () => {
    const user = await makeUser();
    const token = createUnsubscribeToken({ userId: user.id, category: "events" });
    const path = `${UNSUBSCRIBE_PATH}?token=${encodeURIComponent(token)}`;

    // A link scanner pre-fetching the URL must not opt anybody out.
    const getRes = await client.get(path);
    const afterGet = parseNotificationPrefs(
      (await prisma.user.findUnique({ where: { id: user.id } }))!.notificationPrefs,
    );

    const postRes = await client.post(path);
    const afterPost = parseNotificationPrefs(
      (await prisma.user.findUnique({ where: { id: user.id } }))!.notificationPrefs,
    );

    reportCase(
      "GET/POST /api/email/unsubscribe",
      { category: "events" },
      { getLeavesPrefs: true, postDisablesCategory: true },
      {
        getStatus: getRes.status,
        afterGet: afterGet.emailEvents,
        postStatus: postRes.status,
        afterPost: afterPost.emailEvents,
      },
      () => {
        expect(getRes.status).toBe(200);
        expect(afterGet.emailEvents).toBe(true);
        expect(postRes.status).toBe(200);
        expect(afterPost.emailEvents).toBe(false);
        // Other categories are untouched.
        expect(afterPost.emailTasks).toBe(true);
      },
    );
  });

  it("refuses a forged token", async () => {
    const res = await client.post(`${UNSUBSCRIBE_PATH}?token=abc.def`);
    expect(res.status).toBe(400);
  });
});

describe("cron routes", () => {
  it("rejects a request with no cron credentials", async () => {
    const res = await client.get(`${CRON_PATH}/event-reminders`);

    reportCase(
      "GET /api/cron/email/event-reminders (unauthenticated)",
      { authorization: "<none>" },
      { status: 401 },
      { status: res.status, body: res.body },
      () => expect(res.status).toBe(401),
    );
  });

  it("rejects a wrong bearer token", async () => {
    const res = await client.request("GET", `${CRON_PATH}/event-reminders`, {
      headers: { Authorization: "Bearer definitely-not-the-secret" },
    });
    expect(res.status).toBe(401);
  });

  it("runs a sweep with the right secret and 404s an unknown one", async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      console.log("\n[skip] CRON_SECRET is not set in this environment");
      return;
    }
    const headers = { Authorization: `Bearer ${secret}` };

    const ok = await client.request("GET", `${CRON_PATH}/task-overdue`, { headers });
    const unknown = await client.request("GET", `${CRON_PATH}/not-a-sweep`, { headers });

    reportCase(
      "GET /api/cron/email/{sweep} (authenticated)",
      { sweep: "task-overdue" },
      { status: 200, unknownSweep: 404 },
      { status: ok.status, body: ok.body, unknownSweep: unknown.status },
      () => {
        expect(ok.status).toBe(200);
        expect(ok.body.success).toBe(true);
        expect(ok.body.data.sweep).toBe("task-overdue");
        expect(unknown.status).toBe(404);
      },
    );
  });
});
