import * as templates from "@/backend/email/templates";
import type { RenderedEmail, TemplateName } from "@/backend/email/templates";
import { EMAIL_PREF_KEYS } from "@/lib/notification-prefs";

const DATE = new Date("2026-09-18T00:00:00.000Z");
const DUE = new Date("2026-09-17T13:30:00.000Z");
const MANAGE = "https://sangam.test/api/email/unsubscribe?token=abc";

/**
 * Every template, with the data it needs. Kept as one table so a template added
 * without a test fails the `covers every template` case below rather than
 * quietly shipping unrendered.
 */
const CASES: Record<TemplateName, () => RenderedEmail> = {
  verifyEmail: () =>
    templates.verifyEmail({
      name: "Asha",
      verifyUrl: "https://sangam.test/api/auth/verify-email?token=t",
      manageUrl: MANAGE,
      expiresInHours: 24,
    }),
  resetPassword: () =>
    templates.resetPassword({
      name: "Asha",
      resetUrl: "https://sangam.test/reset-password?token=t",
      expiresInHours: 1,
    }),
  membershipApplicationReceived: () =>
    templates.membershipApplicationReceived({
      name: "Asha",
      clubName: "CodeChef",
      clubsUrl: "https://sangam.test/app/clubs",
      manageUrl: MANAGE,
    }),
  membershipApproved: () =>
    templates.membershipApproved({
      name: "Asha",
      clubName: "CodeChef",
      clubUrl: "https://sangam.test/app/clubs",
      manageUrl: MANAGE,
    }),
  membershipRejected: () =>
    templates.membershipRejected({
      name: "Asha",
      clubName: "CodeChef",
      clubsUrl: "https://sangam.test/app/clubs",
      manageUrl: MANAGE,
    }),
  welcome: () =>
    templates.welcome({
      name: "Asha",
      clubName: "CodeChef",
      appUrl: "https://sangam.test/app",
      manageUrl: MANAGE,
    }),
  membershipRequestAwaitingApproval: () =>
    templates.membershipRequestAwaitingApproval({
      adminName: "Ravi",
      applicantName: "Asha",
      applicantEmail: "asha@ds.study.iitm.ac.in",
      clubName: "CodeChef",
      approvalsUrl: "https://sangam.test/admin/approvals",
      manageUrl: MANAGE,
    }),
  eventCreated: () =>
    templates.eventCreated({
      name: "Asha",
      eventTitle: "Fusion Night VI",
      clubName: "Sarga",
      date: DATE,
      time: "18:00",
      venue: "Amphitheatre",
      eventUrl: "https://sangam.test/app/events/fusion-night-vi",
      manageUrl: MANAGE,
    }),
  registrationConfirmation: () =>
    templates.registrationConfirmation({
      name: "Asha",
      eventTitle: "Fusion Night VI",
      clubName: "Sarga",
      date: DATE,
      time: "18:00",
      venue: "Amphitheatre",
      eventUrl: "https://sangam.test/app/events/fusion-night-vi",
      manageUrl: MANAGE,
    }),
  eventReminder: () =>
    templates.eventReminder({
      name: "Asha",
      eventTitle: "Fusion Night VI",
      clubName: "Sarga",
      date: DATE,
      time: "18:00",
      venue: "Amphitheatre",
      eventUrl: "https://sangam.test/app/events/fusion-night-vi",
      manageUrl: MANAGE,
    }),
  eventScheduleChange: () =>
    templates.eventScheduleChange({
      name: "Asha",
      eventTitle: "Fusion Night VI",
      clubName: "Sarga",
      changes: [{ label: "Venue", from: "Amphitheatre", to: "Main Hall" }],
      date: DATE,
      time: "19:00",
      venue: "Main Hall",
      eventUrl: "https://sangam.test/app/events/fusion-night-vi",
      manageUrl: MANAGE,
    }),
  registrationClosingSoon: () =>
    templates.registrationClosingSoon({
      name: "Asha",
      eventTitle: "Fusion Night VI",
      clubName: "Sarga",
      date: DATE,
      time: "18:00",
      spotsLeft: 3,
      eventUrl: "https://sangam.test/app/events/fusion-night-vi",
      manageUrl: MANAGE,
    }),
  eventCancelled: () =>
    templates.eventCancelled({
      name: "Asha",
      eventTitle: "Fusion Night VI",
      clubName: "Sarga",
      date: DATE,
      time: "18:00",
      reason: "Venue withdrawn",
      eventsUrl: "https://sangam.test/app/events",
      manageUrl: MANAGE,
    }),
  eventApprovalDecision: () =>
    templates.eventApprovalDecision({
      name: "Ravi",
      eventTitle: "Fusion Night VI",
      approved: true,
      eventUrl: "https://sangam.test/coordinator/events/fusion-night-vi",
      manageUrl: MANAGE,
    }),
  facultyEventAwaitingApproval: () =>
    templates.facultyEventAwaitingApproval({
      facultyName: "Dr Rao",
      eventTitle: "Fusion Night VI",
      clubName: "Sarga",
      date: DATE,
      time: "18:00",
      venue: "Amphitheatre",
      approvalsUrl: "https://sangam.test/faculty/approvals",
      manageUrl: MANAGE,
    }),
  taskAssigned: () =>
    templates.taskAssigned({
      name: "Asha",
      taskTitle: "Run the sound desk",
      role: "Sound",
      eventTitle: "Fusion Night VI",
      dueAt: DUE,
      tasksUrl: "https://sangam.test/volunteer",
      manageUrl: MANAGE,
    }),
  taskDueReminder: () =>
    templates.taskDueReminder({
      name: "Asha",
      taskTitle: "Run the sound desk",
      eventTitle: "Fusion Night VI",
      dueAt: DUE,
      tasksUrl: "https://sangam.test/volunteer",
      manageUrl: MANAGE,
    }),
  taskOverdue: () =>
    templates.taskOverdue({
      name: "Asha",
      taskTitle: "Run the sound desk",
      eventTitle: "Fusion Night VI",
      dueAt: DUE,
      tasksUrl: "https://sangam.test/volunteer",
      manageUrl: MANAGE,
    }),
  announcementNew: () =>
    templates.announcementNew({
      name: "Asha",
      title: "Rehearsal moved",
      body: "Amphitheatre is booked, so Thursday's rehearsal moves to the Main Hall.",
      clubName: "Sarga",
      authorName: "Ravi",
      announcementsUrl: "https://sangam.test/app",
      manageUrl: MANAGE,
    }),
  announcementDigest: () =>
    templates.announcementDigest({
      name: "Asha",
      items: [
        { title: "Rehearsal moved", body: "Now in the Main Hall.", clubName: "Sarga" },
        { title: "New mics", body: "Sign-up sheet is up.", clubName: "Sarga" },
      ],
      announcementsUrl: "https://sangam.test/app",
      manageUrl: MANAGE,
    }),
  issueSubmitted: () =>
    templates.issueSubmitted({
      name: "Asha",
      issueTitle: "Cannot register for Fusion Night",
      category: "Registration",
      issuesUrl: "https://sangam.test/app/issues",
      manageUrl: MANAGE,
    }),
  issueStatusChanged: () =>
    templates.issueStatusChanged({
      name: "Asha",
      issueTitle: "Cannot register for Fusion Night",
      status: "In progress",
      issuesUrl: "https://sangam.test/app/issues",
      manageUrl: MANAGE,
    }),
  issueResolved: () =>
    templates.issueResolved({
      name: "Asha",
      issueTitle: "Cannot register for Fusion Night",
      issuesUrl: "https://sangam.test/app/issues",
      manageUrl: MANAGE,
    }),
  issueReply: () =>
    templates.issueReply({
      name: "Asha",
      issueTitle: "Cannot register for Fusion Night",
      replyAuthor: "Ravi",
      replyBody: "Fixed — try again now.",
      issuesUrl: "https://sangam.test/app/issues",
      manageUrl: MANAGE,
    }),
  handoverConfirmation: () =>
    templates.handoverConfirmation({
      name: "Ravi",
      clubName: "CodeChef",
      outgoingAdminName: "Priya",
      incomingAdminName: "Ravi",
      isIncoming: true,
      adminUrl: "https://sangam.test/admin",
      manageUrl: MANAGE,
    }),
  roleChanged: () =>
    templates.roleChanged({
      name: "Asha",
      clubName: "CodeChef",
      role: "Coordinator",
      appUrl: "https://sangam.test/app",
      manageUrl: MANAGE,
    }),
  handoverBrief: () =>
    templates.handoverBrief({
      name: "Ravi",
      clubName: "CodeChef",
      brief: "Two events are live.\n\nThree issues are open.",
      adminUrl: "https://sangam.test/admin",
      manageUrl: MANAGE,
    }),
  clubRequestSubmitted: () =>
    templates.clubRequestSubmitted({
      name: "Asha",
      clubName: "Photon - Robotics",
      requestsUrl: "https://sangam.test/app/clubs",
      manageUrl: MANAGE,
    }),
  clubRequestAwaitingReview: () =>
    templates.clubRequestAwaitingReview({
      facultyName: "Dr Rao",
      clubName: "Photon - Robotics",
      requesterName: "Asha",
      requesterEmail: "asha@ds.study.iitm.ac.in",
      category: "Technical",
      tagline: "Bots, boards, and Saturday build nights.",
      reviewUrl: "https://sangam.test/faculty/club-requests",
      manageUrl: MANAGE,
    }),
  clubRequestApproved: () =>
    templates.clubRequestApproved({
      name: "Asha",
      clubName: "Photon - Robotics",
      adminUrl: "https://sangam.test/admin",
      manageUrl: MANAGE,
    }),
  clubRequestRejected: () =>
    templates.clubRequestRejected({
      name: "Asha",
      clubName: "Photon - Robotics",
      note: "Overlaps heavily with an existing club.",
      clubsUrl: "https://sangam.test/app/clubs",
      manageUrl: MANAGE,
    }),
  facultyAccessGranted: () =>
    templates.facultyAccessGranted({
      name: "Dr Rao",
      grantedByName: "Dr Iyer",
      facultyUrl: "https://sangam.test/faculty",
      manageUrl: MANAGE,
    }),
};

const NAMES = Object.keys(CASES) as TemplateName[];

describe("email templates", () => {
  it("covers every template the app can send", () => {
    // TemplateName is the contract; this asserts the table hasn't drifted.
    expect(NAMES.length).toBe(32);
  });

  it.each(NAMES)("%s renders a complete email", (name) => {
    const email = CASES[name]();

    expect(email.subject.trim().length).toBeGreaterThan(0);
    expect(email.subject).not.toContain("undefined");
    expect(email.html.trim().length).toBeGreaterThan(0);
    expect(email.text.trim().length).toBeGreaterThan(0);
    expect(email.html).not.toContain("undefined");
    expect(email.text).not.toContain("undefined");
    // A plain-text part is what non-HTML clients and spam filters read.
    expect(email.text).not.toContain("<table");
  });

  it.each(NAMES)("%s declares a category the prefs layer understands", (name) => {
    const { category } = CASES[name]();
    if (category !== null) {
      expect(Object.keys(EMAIL_PREF_KEYS)).toContain(category);
    }
  });

  // Verification is the one email a recipient must always get: it's how they
  // prove the address is theirs, so it cannot be behind an opt-out.
  it("keeps signup verification transactional", () => {
    expect(templates.verifyEmail({
      name: "Asha",
      verifyUrl: "https://sangam.test/v",
      manageUrl: MANAGE,
      expiresInHours: 24,
    }).category).toBeNull();
  });

  it("escapes user-controlled copy rather than trusting it", () => {
    const email = templates.announcementNew({
      name: "Asha",
      title: `<script>alert("xss")</script>`,
      body: "<img src=x onerror=alert(1)>",
      clubName: "Sarga",
      authorName: "Ravi",
      announcementsUrl: "https://sangam.test/app",
      manageUrl: MANAGE,
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("spells out what moved in a schedule change", () => {
    const email = templates.eventScheduleChange({
      name: "Asha",
      eventTitle: "Fusion Night VI",
      clubName: "Sarga",
      changes: [
        { label: "Date", from: "18 September 2026", to: "19 September 2026" },
        { label: "Venue", from: "Amphitheatre", to: "Main Hall" },
      ],
      date: DATE,
      time: "18:00",
      venue: "Main Hall",
      eventUrl: "https://sangam.test/app/events/fusion-night-vi",
      manageUrl: MANAGE,
    });

    expect(email.text).toContain("Date: 18 September 2026 → 19 September 2026");
    expect(email.text).toContain("Venue: Amphitheatre → Main Hall");
    expect(email.subject.toLowerCase()).toContain("changed");
  });

  it("truncates a very long announcement instead of mailing the whole thing", () => {
    const email = templates.announcementNew({
      name: "Asha",
      title: "Long one",
      body: "x".repeat(5000),
      clubName: "Sarga",
      authorName: "Ravi",
      announcementsUrl: "https://sangam.test/app",
      manageUrl: MANAGE,
    });

    expect(email.text).toContain("…");
    expect(email.text.length).toBeLessThan(1500);
  });

  it("reads naturally when a task has no due date", () => {
    const email = templates.taskAssigned({
      name: "Asha",
      taskTitle: "Run the sound desk",
      role: "Sound",
      eventTitle: "Fusion Night VI",
      dueAt: null,
      tasksUrl: "https://sangam.test/volunteer",
      manageUrl: MANAGE,
    });
    expect(email.text).toContain("Due: No due date");
  });

  it("changes voice for a rejected event and a full event", () => {
    const rejected = templates.eventApprovalDecision({
      name: "Ravi",
      eventTitle: "Fusion Night VI",
      approved: false,
      eventUrl: "https://sangam.test/coordinator/events/x",
      manageUrl: MANAGE,
    });
    expect(rejected.subject).toContain("Not approved");

    const full = templates.registrationClosingSoon({
      name: "Asha",
      eventTitle: "Fusion Night VI",
      clubName: "Sarga",
      date: DATE,
      time: "18:00",
      spotsLeft: 0,
      eventUrl: "https://sangam.test/app/events/x",
      manageUrl: MANAGE,
    });
    expect(full.text).toContain("currently full");

    const one = templates.registrationClosingSoon({
      name: "Asha",
      eventTitle: "Fusion Night VI",
      clubName: "Sarga",
      date: DATE,
      time: "18:00",
      spotsLeft: 1,
      eventUrl: "https://sangam.test/app/events/x",
      manageUrl: MANAGE,
    });
    expect(one.text).toContain("Only 1 spot left");
  });

  it("addresses the outgoing and incoming admin differently", () => {
    const shared = {
      clubName: "CodeChef",
      outgoingAdminName: "Priya",
      incomingAdminName: "Ravi",
      adminUrl: "https://sangam.test/admin",
      manageUrl: MANAGE,
    };
    const incoming = templates.handoverConfirmation({ ...shared, name: "Ravi", isIncoming: true });
    const outgoing = templates.handoverConfirmation({ ...shared, name: "Priya", isIncoming: false });

    expect(incoming.text).toContain("You're now the admin".toUpperCase());
    expect(incoming.text).toContain("has handed you the admin role");
    expect(outgoing.text).toContain("has been transferred to Ravi");
    expect(outgoing.text).toContain("now a coordinator");
  });

  it("pluralises the digest heading", () => {
    const item = { title: "T", body: "B", clubName: "Sarga" };
    const one = templates.announcementDigest({
      name: "Asha",
      items: [item],
      announcementsUrl: "https://sangam.test/app",
      manageUrl: MANAGE,
    });
    const many = templates.announcementDigest({
      name: "Asha",
      items: [item, item, item],
      announcementsUrl: "https://sangam.test/app",
      manageUrl: MANAGE,
    });

    expect(one.subject).toContain("1 new announcement");
    expect(many.subject).toContain("3 new announcements");
  });
});
