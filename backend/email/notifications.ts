import { prisma } from "@/backend/db/prisma";
import { sendEmail, sendEmails, summarize, type SendEmailInput, type SendResult } from "@/backend/email/client";
import { emailLinks, manageUrlFor } from "@/backend/email/routes";
import {
  clubAdminRecipients,
  clubRecipients,
  dedupeRecipients,
  eventRegistrantRecipients,
  excludeUser,
  facultyRecipients,
  userRecipient,
  type Recipient,
} from "@/backend/email/recipients";
import * as templates from "@/backend/email/templates";
import { parseNotificationPrefs } from "@/lib/notification-prefs";

/**
 * The API the rest of the app calls: one function per thing that happens,
 * named after the event rather than the email. Domain code says
 * "a membership was approved" and this layer decides who hears about it.
 *
 * Every function here is best-effort and swallows its own errors — a failed
 * notification must never roll back or fail the action that triggered it. They
 * return counts so cron routes and tests can assert on them.
 */

export type NotifySummary = ReturnType<typeof summarize>;

const EMPTY: NotifySummary = { sent: 0, dryRun: 0, skipped: 0, failed: 0, duplicate: 0 };

/**
 * Immediate, action-triggered mail is deduped on the mutation's identity plus
 * a one-minute bucket: a double-submitted form collapses to one email, while a
 * membership legitimately re-approved next week still notifies. Scheduled mail
 * uses no bucket — see scheduled.ts, where the target window *is* the key.
 */
function minuteBucket(): number {
  return Math.floor(Date.now() / 60_000);
}

function dedupeKey(...parts: (string | number)[]): string {
  return parts.join(":");
}

async function run(inputs: SendEmailInput[]): Promise<NotifySummary> {
  if (inputs.length === 0) return { ...EMPTY };
  try {
    const summary = summarize(await sendEmails(inputs));
    // One line per fan-out, so "did that announcement actually go out?" is
    // answerable from the logs without reconstructing it from EmailLog rows
    // (skips write none — see the note in client.ts).
    const counts = Object.entries(summary)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => `${status}=${count}`)
      .join(" ");
    console.log(`[email] ${inputs[0].template} × ${inputs.length} → ${counts}`);
    return summary;
  } catch (error) {
    console.error("[email] fan-out failed", error);
    return { ...EMPTY, failed: inputs.length };
  }
}

async function runOne(input: SendEmailInput | null): Promise<SendResult> {
  if (!input) return { status: "skipped", reason: "no recipient" };
  try {
    return await sendEmail(input);
  } catch (error) {
    console.error("[email] send failed", error);
    return { status: "failed", reason: error instanceof Error ? error.message : String(error) };
  }
}

// --- Auth & membership -------------------------------------------------------

/** Signup verification. Transactional: no preference can switch it off. */
export async function notifyEmailVerification(
  user: { id: string; name: string; email: string },
  token: string,
  expiresInHours: number,
): Promise<SendResult> {
  const rendered = templates.verifyEmail({
    name: user.name,
    verifyUrl: emailLinks.verify(token),
    manageUrl: emailLinks.profile(),
    expiresInHours,
  });
  return runOne({
    to: user.email,
    userId: user.id,
    template: "verifyEmail",
    rendered,
    // One key per issued token, so re-requesting verification always mails.
    dedupeKey: dedupeKey("verifyEmail", user.id, token.slice(0, 12)),
  });
}

/** "Forgot password" link. Transactional: no preference can switch it off. */
export async function notifyPasswordReset(
  user: { id: string; name: string; email: string },
  token: string,
  expiresInHours: number,
): Promise<SendResult> {
  const rendered = templates.resetPassword({
    name: user.name,
    resetUrl: emailLinks.resetPassword(token),
    expiresInHours,
  });
  return runOne({
    to: user.email,
    userId: user.id,
    template: "resetPassword",
    rendered,
    // One key per issued token, so re-requesting a reset always mails.
    dedupeKey: dedupeKey("resetPassword", user.id, token.slice(0, 12)),
  });
}

/** A member applied to join a club: confirm to them, alert the club's admins. */
export async function notifyMembershipApplied(userId: string, clubId: string): Promise<NotifySummary> {
  const [applicant, club, admins] = await Promise.all([
    userRecipient(userId),
    prisma.club.findUnique({ where: { id: clubId }, select: { name: true } }),
    clubAdminRecipients(clubId),
  ]);
  if (!applicant || !club) return { ...EMPTY };

  const bucket = minuteBucket();
  const inputs: SendEmailInput[] = [
    {
      to: applicant.email,
      userId: applicant.userId,
      prefsJson: applicant.prefsJson,
      template: "membershipApplicationReceived",
      rendered: templates.membershipApplicationReceived({
        name: applicant.name,
        clubName: club.name,
        clubsUrl: emailLinks.clubs(),
        manageUrl: manageUrlFor(applicant.userId, "membership"),
      }),
      dedupeKey: dedupeKey("membershipApplied", userId, clubId, bucket),
    },
    ...excludeUser(admins, userId).map((admin) => ({
      to: admin.email,
      userId: admin.userId,
      prefsJson: admin.prefsJson,
      template: "membershipRequestAwaitingApproval" as const,
      rendered: templates.membershipRequestAwaitingApproval({
        adminName: admin.name,
        applicantName: applicant.name,
        applicantEmail: applicant.email,
        clubName: club.name,
        approvalsUrl: emailLinks.adminApprovals(),
        manageUrl: manageUrlFor(admin.userId, "membership"),
      }),
      dedupeKey: dedupeKey("membershipAwaiting", userId, clubId, admin.userId, bucket),
    })),
  ];

  return run(inputs);
}

/**
 * A membership moved to Active or Inactive. Also sends the one-time welcome
 * when this is the recipient's first active membership anywhere — that's what
 * makes it a welcome rather than a second approval email.
 */
export async function notifyMembershipDecision(
  membershipId: string,
  status: "Active" | "Inactive" | "Pending",
): Promise<NotifySummary> {
  if (status === "Pending") return { ...EMPTY };

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: {
      club: { select: { name: true, slug: true } },
      user: { select: { id: true, name: true, email: true, notificationPrefs: true } },
    },
  });
  if (!membership) return { ...EMPTY };

  const { user, club } = membership;
  const manageUrl = manageUrlFor(user.id, "membership");
  const bucket = minuteBucket();
  const inputs: SendEmailInput[] = [];

  if (status === "Active") {
    inputs.push({
      to: user.email,
      userId: user.id,
      prefsJson: user.notificationPrefs,
      template: "membershipApproved",
      rendered: templates.membershipApproved({
        name: user.name,
        clubName: club.name,
        clubUrl: emailLinks.clubs(),
        manageUrl,
      }),
      dedupeKey: dedupeKey("membershipApproved", membershipId, bucket),
    });

    // The welcome is keyed on the user alone, so it can only ever go once.
    const activeCount = await prisma.membership.count({
      where: { userId: user.id, status: "Active" },
    });
    if (activeCount <= 1) {
      inputs.push({
        to: user.email,
        userId: user.id,
        prefsJson: user.notificationPrefs,
        template: "welcome",
        rendered: templates.welcome({
          name: user.name,
          clubName: club.name,
          appUrl: emailLinks.app(),
          manageUrl,
        }),
        dedupeKey: dedupeKey("welcome", user.id),
      });
    }
  } else {
    inputs.push({
      to: user.email,
      userId: user.id,
      prefsJson: user.notificationPrefs,
      template: "membershipRejected",
      rendered: templates.membershipRejected({
        name: user.name,
        clubName: club.name,
        clubsUrl: emailLinks.clubs(),
        manageUrl,
      }),
      dedupeKey: dedupeKey("membershipRejected", membershipId, bucket),
    });
  }

  return run(inputs);
}

/** A member's role within a club changed (Member → Volunteer, and so on). */
export async function notifyRoleChanged(userId: string, clubId: string, role: string): Promise<SendResult> {
  const [recipient, club] = await Promise.all([
    userRecipient(userId),
    prisma.club.findUnique({ where: { id: clubId }, select: { name: true } }),
  ]);
  if (!recipient || !club) return { status: "skipped", reason: "no recipient" };

  return runOne({
    to: recipient.email,
    userId: recipient.userId,
    prefsJson: recipient.prefsJson,
    template: "roleChanged",
    rendered: templates.roleChanged({
      name: recipient.name,
      clubName: club.name,
      role,
      appUrl: emailLinks.app(),
      manageUrl: manageUrlFor(recipient.userId, "membership"),
    }),
    dedupeKey: dedupeKey("roleChanged", userId, clubId, role, minuteBucket()),
  });
}

/** Admin handover: confirms to both the outgoing and the incoming admin. */
export async function notifyAdminHandover(
  clubId: string,
  outgoingUserId: string,
  incomingUserId: string,
): Promise<NotifySummary> {
  const [outgoing, incoming, club] = await Promise.all([
    userRecipient(outgoingUserId),
    userRecipient(incomingUserId),
    prisma.club.findUnique({ where: { id: clubId }, select: { name: true } }),
  ]);
  if (!outgoing || !incoming || !club) return { ...EMPTY };

  const bucket = minuteBucket();
  const shared = {
    clubName: club.name,
    outgoingAdminName: outgoing.name,
    incomingAdminName: incoming.name,
  };

  return run([
    {
      to: incoming.email,
      userId: incoming.userId,
      prefsJson: incoming.prefsJson,
      template: "handoverConfirmation",
      rendered: templates.handoverConfirmation({
        ...shared,
        name: incoming.name,
        isIncoming: true,
        adminUrl: emailLinks.adminDashboard(),
        manageUrl: manageUrlFor(incoming.userId, "membership"),
      }),
      dedupeKey: dedupeKey("handover", clubId, incomingUserId, "in", bucket),
    },
    {
      to: outgoing.email,
      userId: outgoing.userId,
      prefsJson: outgoing.prefsJson,
      template: "handoverConfirmation",
      rendered: templates.handoverConfirmation({
        ...shared,
        name: outgoing.name,
        isIncoming: false,
        adminUrl: emailLinks.app(),
        manageUrl: manageUrlFor(outgoing.userId, "membership"),
      }),
      dedupeKey: dedupeKey("handover", clubId, outgoingUserId, "out", bucket),
    },
  ]);
}

/**
 * Emails a generated handover brief to the incoming admin.
 *
 * Nothing calls this yet: the brief *generator* is a GenAI feature tracked
 * separately (the `add/gen-ai` branch), and lib/genai.ts only notes it as
 * future work. The email half is done and tested so that feature just has to
 * hand over a string.
 */
export async function notifyHandoverBrief(
  clubId: string,
  incomingUserId: string,
  brief: string,
): Promise<SendResult> {
  const [recipient, club] = await Promise.all([
    userRecipient(incomingUserId),
    prisma.club.findUnique({ where: { id: clubId }, select: { name: true } }),
  ]);
  if (!recipient || !club) return { status: "skipped", reason: "no recipient" };

  return runOne({
    to: recipient.email,
    userId: recipient.userId,
    prefsJson: recipient.prefsJson,
    template: "handoverBrief",
    rendered: templates.handoverBrief({
      name: recipient.name,
      clubName: club.name,
      brief,
      adminUrl: emailLinks.adminDashboard(),
      manageUrl: manageUrlFor(recipient.userId, "membership"),
    }),
    dedupeKey: dedupeKey("handoverBrief", clubId, incomingUserId, minuteBucket()),
  });
}

// --- Events ------------------------------------------------------------------

/**
 * A coordinator created an event: tell the club's members it exists, and tell
 * faculty it needs approval. Members hear about it now rather than at approval
 * time so the club can start gauging interest.
 */
export async function notifyEventCreated(eventId: string): Promise<NotifySummary> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { club: { select: { id: true, name: true } } },
  });
  if (!event) return { ...EMPTY };

  const [members, faculty] = await Promise.all([clubRecipients(event.club.id), facultyRecipients()]);
  const bucket = minuteBucket();

  const inputs: SendEmailInput[] = [
    ...members.map((member) => ({
      to: member.email,
      userId: member.userId,
      prefsJson: member.prefsJson,
      template: "eventCreated" as const,
      rendered: templates.eventCreated({
        name: member.name,
        eventTitle: event.title,
        clubName: event.club.name,
        date: event.date,
        time: event.time,
        venue: event.venue,
        eventUrl: emailLinks.event(event.slug),
        manageUrl: manageUrlFor(member.userId, "events"),
      }),
      dedupeKey: dedupeKey("eventCreated", eventId, member.userId),
    })),
    ...faculty.map((reviewer) => ({
      to: reviewer.email,
      userId: reviewer.userId,
      prefsJson: reviewer.prefsJson,
      template: "facultyEventAwaitingApproval" as const,
      rendered: templates.facultyEventAwaitingApproval({
        facultyName: reviewer.name,
        eventTitle: event.title,
        clubName: event.club.name,
        date: event.date,
        time: event.time,
        venue: event.venue,
        approvalsUrl: emailLinks.facultyApprovals(),
        manageUrl: manageUrlFor(reviewer.userId, "events"),
      }),
      dedupeKey: dedupeKey("facultyApprovalNeeded", eventId, reviewer.userId, bucket),
    })),
  ];

  return run(inputs);
}

/** Confirms a member's own registration. */
export async function notifyRegistrationConfirmed(userId: string, eventId: string): Promise<SendResult> {
  const [recipient, event] = await Promise.all([
    userRecipient(userId),
    prisma.event.findUnique({
      where: { id: eventId },
      include: { club: { select: { name: true } } },
    }),
  ]);
  if (!recipient || !event) return { status: "skipped", reason: "no recipient" };

  return runOne({
    to: recipient.email,
    userId: recipient.userId,
    prefsJson: recipient.prefsJson,
    template: "registrationConfirmation",
    rendered: templates.registrationConfirmation({
      name: recipient.name,
      eventTitle: event.title,
      clubName: event.club.name,
      date: event.date,
      time: event.time,
      venue: event.venue,
      eventUrl: emailLinks.event(event.slug),
      manageUrl: manageUrlFor(recipient.userId, "events"),
    }),
    // Bucketed: withdrawing and re-registering later should confirm again.
    dedupeKey: dedupeKey("registered", eventId, userId, minuteBucket()),
  });
}

export type EventChange = { label: string; from: string; to: string };

/**
 * The highest-priority notification in the user stories: date, time or venue
 * moved on an event people have already committed to. Only registrants are
 * mailed, and only when something they'd act on actually changed.
 */
export async function notifyEventScheduleChange(
  eventId: string,
  changes: EventChange[],
): Promise<NotifySummary> {
  if (changes.length === 0) return { ...EMPTY };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { club: { select: { name: true } } },
  });
  if (!event) return { ...EMPTY };

  const registrants = await eventRegistrantRecipients(eventId);
  const bucket = minuteBucket();

  return run(
    registrants.map((person) => ({
      to: person.email,
      userId: person.userId,
      prefsJson: person.prefsJson,
      template: "eventScheduleChange" as const,
      rendered: templates.eventScheduleChange({
        name: person.name,
        eventTitle: event.title,
        clubName: event.club.name,
        changes,
        date: event.date,
        time: event.time,
        venue: event.venue,
        eventUrl: emailLinks.event(event.slug),
        manageUrl: manageUrlFor(person.userId, "events"),
      }),
      dedupeKey: dedupeKey("scheduleChange", eventId, person.userId, bucket),
    })),
  );
}

/** Faculty or admin decided on an event: tell the club's coordinators. */
export async function notifyEventApprovalDecision(eventId: string, approved: boolean): Promise<NotifySummary> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { club: { select: { id: true, name: true } } },
  });
  if (!event) return { ...EMPTY };

  const organisers = await clubRecipients(event.club.id, "Coordinators");
  const bucket = minuteBucket();

  return run(
    organisers.map((person) => ({
      to: person.email,
      userId: person.userId,
      prefsJson: person.prefsJson,
      template: "eventApprovalDecision" as const,
      rendered: templates.eventApprovalDecision({
        name: person.name,
        eventTitle: event.title,
        approved,
        eventUrl: emailLinks.coordinatorEvent(event.slug),
        manageUrl: manageUrlFor(person.userId, "events"),
      }),
      dedupeKey: dedupeKey("approvalDecision", eventId, approved ? "yes" : "no", person.userId, bucket),
    })),
  );
}

/** An event won't happen: tell everyone who had a spot. */
export async function notifyEventCancelled(eventId: string, reason?: string): Promise<NotifySummary> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { club: { select: { name: true } } },
  });
  if (!event) return { ...EMPTY };

  const registrants = await eventRegistrantRecipients(eventId);
  const bucket = minuteBucket();

  return run(
    registrants.map((person) => ({
      to: person.email,
      userId: person.userId,
      prefsJson: person.prefsJson,
      template: "eventCancelled" as const,
      rendered: templates.eventCancelled({
        name: person.name,
        eventTitle: event.title,
        clubName: event.club.name,
        date: event.date,
        time: event.time,
        reason,
        eventsUrl: emailLinks.events(),
        manageUrl: manageUrlFor(person.userId, "events"),
      }),
      dedupeKey: dedupeKey("eventCancelled", eventId, person.userId, bucket),
    })),
  );
}

// --- Tasks -------------------------------------------------------------------

export async function notifyTaskAssigned(taskId: string): Promise<SendResult> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      event: { select: { title: true } },
      assignee: { select: { id: true, name: true, email: true, notificationPrefs: true } },
    },
  });
  if (!task) return { status: "skipped", reason: "task not found" };

  return runOne({
    to: task.assignee.email,
    userId: task.assignee.id,
    prefsJson: task.assignee.notificationPrefs,
    template: "taskAssigned",
    rendered: templates.taskAssigned({
      name: task.assignee.name,
      taskTitle: task.title,
      role: task.role,
      eventTitle: task.event.title,
      dueAt: task.dueAt,
      tasksUrl: emailLinks.volunteerTasks(),
      manageUrl: manageUrlFor(task.assignee.id, "tasks"),
    }),
    dedupeKey: dedupeKey("taskAssigned", taskId, task.assignee.id),
  });
}

// --- Communication -----------------------------------------------------------

/**
 * A new announcement. High priority mails immediately; Low and Med are left
 * for the digest sweep so a chatty club can't flood inboxes — the
 * "don't over-notify" constraint from the issue, made concrete.
 *
 * `pinnedAnnouncementsOnly` is honoured here rather than in sendEmail: it isn't
 * a category switch, it's a filter on which announcements count at all.
 */
export async function notifyAnnouncement(announcementId: string): Promise<NotifySummary> {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: {
      club: { select: { id: true, name: true } },
      author: { select: { id: true, name: true } },
    },
  });
  if (!announcement) return { ...EMPTY };
  if (announcement.priority !== "High") return { ...EMPTY };

  const audience = await clubRecipients(announcement.club.id, announcement.audience);
  const recipients = audience.filter((person) => {
    if (announcement.pinned) return true;
    return !parseNotificationPrefs(person.prefsJson).pinnedAnnouncementsOnly;
  });

  return run(
    excludeUser(recipients, announcement.authorId).map((person) => ({
      to: person.email,
      userId: person.userId,
      prefsJson: person.prefsJson,
      template: "announcementNew" as const,
      rendered: templates.announcementNew({
        name: person.name,
        title: announcement.title,
        body: announcement.body,
        clubName: announcement.club.name,
        authorName: announcement.author.name,
        announcementsUrl: emailLinks.app(),
        manageUrl: manageUrlFor(person.userId, "announcements"),
      }),
      dedupeKey: dedupeKey("announcement", announcementId, person.userId),
    })),
  );
}

// --- Support -----------------------------------------------------------------

export async function notifyIssueSubmitted(issueId: string): Promise<SendResult> {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { raisedBy: { select: { id: true, name: true, email: true, notificationPrefs: true } } },
  });
  if (!issue) return { status: "skipped", reason: "issue not found" };

  return runOne({
    to: issue.raisedBy.email,
    userId: issue.raisedBy.id,
    prefsJson: issue.raisedBy.notificationPrefs,
    template: "issueSubmitted",
    rendered: templates.issueSubmitted({
      name: issue.raisedBy.name,
      issueTitle: issue.title,
      category: issue.category,
      issuesUrl: emailLinks.issues(),
      manageUrl: manageUrlFor(issue.raisedBy.id, "issues"),
    }),
    dedupeKey: dedupeKey("issueSubmitted", issueId),
  });
}

/** Status moved on an issue. Resolved gets its own, warmer template. */
export async function notifyIssueStatusChanged(issueId: string): Promise<SendResult> {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { raisedBy: { select: { id: true, name: true, email: true, notificationPrefs: true } } },
  });
  if (!issue) return { status: "skipped", reason: "issue not found" };

  const { raisedBy } = issue;
  const manageUrl = manageUrlFor(raisedBy.id, "issues");
  const resolved = issue.status === "Resolved";

  return runOne({
    to: raisedBy.email,
    userId: raisedBy.id,
    prefsJson: raisedBy.notificationPrefs,
    template: resolved ? "issueResolved" : "issueStatusChanged",
    rendered: resolved
      ? templates.issueResolved({
          name: raisedBy.name,
          issueTitle: issue.title,
          issuesUrl: emailLinks.issues(),
          manageUrl,
        })
      : templates.issueStatusChanged({
          name: raisedBy.name,
          issueTitle: issue.title,
          status: issue.status === "InProgress" ? "In progress" : issue.status,
          issuesUrl: emailLinks.issues(),
          manageUrl,
        }),
    // Keyed on the status itself: each distinct transition notifies once.
    dedupeKey: dedupeKey("issueStatus", issueId, issue.status),
  });
}

/**
 * Notifies the issue's author that someone replied.
 *
 * Wired for the moment issue threads exist — `Issue` has no comment model yet,
 * so nothing calls this in the app today (see the note in the README). Kept
 * here so the email side of that feature is already done and tested.
 */
export async function notifyIssueReply(data: {
  issueId: string;
  replyId: string;
  replyAuthor: string;
  replyBody: string;
}): Promise<SendResult> {
  const issue = await prisma.issue.findUnique({
    where: { id: data.issueId },
    include: { raisedBy: { select: { id: true, name: true, email: true, notificationPrefs: true } } },
  });
  if (!issue) return { status: "skipped", reason: "issue not found" };

  return runOne({
    to: issue.raisedBy.email,
    userId: issue.raisedBy.id,
    prefsJson: issue.raisedBy.notificationPrefs,
    template: "issueReply",
    rendered: templates.issueReply({
      name: issue.raisedBy.name,
      issueTitle: issue.title,
      replyAuthor: data.replyAuthor,
      replyBody: data.replyBody,
      issuesUrl: emailLinks.issues(),
      manageUrl: manageUrlFor(issue.raisedBy.id, "issues"),
    }),
    dedupeKey: dedupeKey("issueReply", data.replyId),
  });
}

export type { Recipient };

// --- Provisioning ------------------------------------------------------------

/** A student proposed a club: confirm to them, put it in front of faculty. */
export async function notifyClubRequestSubmitted(requestId: string): Promise<NotifySummary> {
  const request = await prisma.clubRequest.findUnique({
    where: { id: requestId },
    include: { requestedBy: { select: { id: true, name: true, email: true, notificationPrefs: true } } },
  });
  if (!request) return { ...EMPTY };

  const faculty = await facultyRecipients();
  const { requestedBy } = request;

  return run([
    {
      to: requestedBy.email,
      userId: requestedBy.id,
      prefsJson: requestedBy.notificationPrefs,
      template: "clubRequestSubmitted",
      rendered: templates.clubRequestSubmitted({
        name: requestedBy.name,
        clubName: request.name,
        requestsUrl: emailLinks.clubs(),
        manageUrl: manageUrlFor(requestedBy.id, "membership"),
      }),
      dedupeKey: dedupeKey("clubRequestSubmitted", requestId),
    },
    ...excludeUser(faculty, requestedBy.id).map((reviewer) => ({
      to: reviewer.email,
      userId: reviewer.userId,
      prefsJson: reviewer.prefsJson,
      template: "clubRequestAwaitingReview" as const,
      rendered: templates.clubRequestAwaitingReview({
        facultyName: reviewer.name,
        clubName: request.name,
        requesterName: requestedBy.name,
        requesterEmail: requestedBy.email,
        category: request.category,
        tagline: request.tagline,
        reviewUrl: emailLinks.facultyClubRequests(),
        manageUrl: manageUrlFor(reviewer.userId, "membership"),
      }),
      dedupeKey: dedupeKey("clubRequestAwaiting", requestId, reviewer.userId),
    })),
  ]);
}

/** Faculty decided on a club proposal. */
export async function notifyClubRequestDecision(requestId: string): Promise<SendResult> {
  const request = await prisma.clubRequest.findUnique({
    where: { id: requestId },
    include: { requestedBy: { select: { id: true, name: true, email: true, notificationPrefs: true } } },
  });
  if (!request || request.status === "Pending") {
    return { status: "skipped", reason: "no decision to report" };
  }

  const { requestedBy } = request;
  const manageUrl = manageUrlFor(requestedBy.id, "membership");
  const approved = request.status === "Approved";

  return runOne({
    to: requestedBy.email,
    userId: requestedBy.id,
    prefsJson: requestedBy.notificationPrefs,
    template: approved ? "clubRequestApproved" : "clubRequestRejected",
    rendered: approved
      ? templates.clubRequestApproved({
          name: requestedBy.name,
          clubName: request.name,
          adminUrl: emailLinks.adminDashboard(),
          manageUrl,
        })
      : templates.clubRequestRejected({
          name: requestedBy.name,
          clubName: request.name,
          note: request.reviewNote ?? undefined,
          clubsUrl: emailLinks.clubs(),
          manageUrl,
        }),
    // Keyed on the outcome, so each distinct decision notifies once.
    dedupeKey: dedupeKey("clubRequestDecision", requestId, request.status),
  });
}

/**
 * Someone was given faculty access. Worth an email because it silently changes
 * what the app expects of them: events now wait on their queue.
 */
export async function notifyFacultyAccessGranted(userId: string, grantedByName: string): Promise<SendResult> {
  const recipient = await userRecipient(userId);
  if (!recipient) return { status: "skipped", reason: "no recipient" };

  return runOne({
    to: recipient.email,
    userId: recipient.userId,
    prefsJson: recipient.prefsJson,
    template: "facultyAccessGranted",
    rendered: templates.facultyAccessGranted({
      name: recipient.name,
      grantedByName,
      facultyUrl: emailLinks.facultyDashboard(),
      manageUrl: manageUrlFor(recipient.userId, "membership"),
    }),
    dedupeKey: dedupeKey("facultyGranted", userId, minuteBucket()),
  });
}
