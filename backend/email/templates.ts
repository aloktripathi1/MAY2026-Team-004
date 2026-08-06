import { renderLayout } from "@/backend/email/render";
import type { EmailCategory } from "@/lib/notification-prefs";

/**
 * One function per email the app can send. Templates are pure: data in,
 * subject/html/text out. They never touch the database, the provider, or
 * process.env, which is what makes them cheap to unit-test.
 *
 * `category` is the preference switch that governs the send. `null` means
 * transactional — verification and confirmations the account owner cannot opt
 * out of. `sendEmail()` enforces this, not the template.
 */
export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
  category: EmailCategory | null;
};

export type TemplateName =
  // Auth & membership
  | "verifyEmail"
  | "membershipApplicationReceived"
  | "membershipApproved"
  | "membershipRejected"
  | "welcome"
  | "membershipRequestAwaitingApproval"
  // Events
  | "eventCreated"
  | "registrationConfirmation"
  | "eventReminder"
  | "eventScheduleChange"
  | "registrationClosingSoon"
  | "eventCancelled"
  | "eventApprovalDecision"
  | "facultyEventAwaitingApproval"
  // Tasks
  | "taskAssigned"
  | "taskDueReminder"
  | "taskOverdue"
  // Communication
  | "announcementNew"
  | "announcementDigest"
  // Support
  | "issueSubmitted"
  | "issueStatusChanged"
  | "issueResolved"
  | "issueReply"
  // Admin
  | "handoverConfirmation"
  | "roleChanged"
  | "handoverBrief"
  // Provisioning
  | "clubRequestSubmitted"
  | "clubRequestAwaitingReview"
  | "clubRequestApproved"
  | "clubRequestRejected"
  | "facultyAccessGranted";

function eventDateTime(date: Date, time: string): string {
  const day = date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${day} at ${time}`;
}

function dueDateTime(date: Date): string {
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Truncates long user copy so a 4,000-word announcement doesn't become the email. */
function excerpt(body: string, limit = 400): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  return collapsed.length <= limit ? collapsed : `${collapsed.slice(0, limit - 1).trimEnd()}…`;
}

// --- Auth & membership -------------------------------------------------------

export function verifyEmail(data: { name: string; verifyUrl: string; manageUrl: string; expiresInHours: number }): RenderedEmail {
  const { html, text } = renderLayout({
    heading: "Confirm your email address",
    preview: "One click and your Sangam account is ready.",
    paragraphs: [
      `Hi ${data.name}, welcome to Sangam.`,
      "Confirm this address so we know we can reach you about the clubs and events you sign up for.",
    ],
    button: { label: "Verify my email", url: data.verifyUrl },
    note: `This link expires in ${data.expiresInHours} hours and can only be used once. If you didn't create a Sangam account, you can ignore this email.`,
  });
  return { subject: "Confirm your Sangam email address", html, text, category: null };
}

export function membershipApplicationReceived(data: { name: string; clubName: string; manageUrl: string; clubsUrl: string }): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `Your request to join ${data.clubName} is in`,
    preview: `${data.clubName} has your membership request.`,
    paragraphs: [
      `Hi ${data.name}, we've passed your request along to the ${data.clubName} admins.`,
      "You'll get another email as soon as they make a decision. Nothing else is needed from you right now.",
    ],
    button: { label: "View my clubs", url: data.clubsUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Request to join ${data.clubName} received`, html, text, category: "membership" };
}

export function membershipApproved(data: { name: string; clubName: string; clubUrl: string; manageUrl: string }): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `You're in — welcome to ${data.clubName}`,
    preview: `Your ${data.clubName} membership was approved.`,
    paragraphs: [
      `Hi ${data.name}, your membership request for ${data.clubName} was approved.`,
      "You can now see the club's events, announcements and volunteer openings in Sangam.",
    ],
    button: { label: `Open ${data.clubName}`, url: data.clubUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Approved: you're a member of ${data.clubName}`, html, text, category: "membership" };
}

export function membershipRejected(data: { name: string; clubName: string; clubsUrl: string; manageUrl: string }): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `Update on your ${data.clubName} request`,
    preview: `A decision was made on your ${data.clubName} request.`,
    paragraphs: [
      `Hi ${data.name}, the ${data.clubName} admins weren't able to approve your membership request this time.`,
      "Clubs often reopen intake between events, and there are plenty of others looking for members right now.",
    ],
    button: { label: "Browse clubs", url: data.clubsUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Update on your ${data.clubName} membership request`, html, text, category: "membership" };
}

export function welcome(data: { name: string; clubName: string; appUrl: string; manageUrl: string }): RenderedEmail {
  const { html, text } = renderLayout({
    heading: "Welcome to Sangam",
    preview: "Here's how to get the most out of Sangam.",
    paragraphs: [
      `Hi ${data.name}, now that you're an active member of ${data.clubName}, your Sangam dashboard is live.`,
      "From here you can count yourself in for events, pick up volunteer tasks, follow announcements and raise an issue if something goes wrong.",
    ],
    button: { label: "Go to my dashboard", url: data.appUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: "Welcome to Sangam", html, text, category: "membership" };
}

export function membershipRequestAwaitingApproval(data: {
  adminName: string;
  applicantName: string;
  applicantEmail: string;
  clubName: string;
  approvalsUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `${data.applicantName} wants to join ${data.clubName}`,
    preview: "A membership request is waiting for your decision.",
    paragraphs: [`Hi ${data.adminName}, a new membership request is waiting on the approvals board.`],
    facts: [
      { label: "Applicant", value: data.applicantName },
      { label: "Email", value: data.applicantEmail },
      { label: "Club", value: data.clubName },
    ],
    button: { label: "Review request", url: data.approvalsUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Membership request: ${data.applicantName} → ${data.clubName}`, html, text, category: "membership" };
}

// --- Events ------------------------------------------------------------------

export function eventCreated(data: {
  name: string;
  eventTitle: string;
  clubName: string;
  date: Date;
  time: string;
  venue: string;
  eventUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `${data.clubName} just announced ${data.eventTitle}`,
    preview: `${data.eventTitle} — ${eventDateTime(data.date, data.time)}`,
    paragraphs: [`Hi ${data.name}, there's a new event on the ${data.clubName} calendar.`],
    facts: [
      { label: "Event", value: data.eventTitle },
      { label: "When", value: eventDateTime(data.date, data.time) },
      { label: "Where", value: data.venue },
    ],
    button: { label: "Count me in", url: data.eventUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `New from ${data.clubName}: ${data.eventTitle}`, html, text, category: "events" };
}

export function registrationConfirmation(data: {
  name: string;
  eventTitle: string;
  clubName: string;
  date: Date;
  time: string;
  venue: string;
  eventUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `You're in for ${data.eventTitle}`,
    preview: `Your spot at ${data.eventTitle} is confirmed.`,
    paragraphs: [
      `Hi ${data.name}, your spot is confirmed. We'll send a reminder the day before.`,
    ],
    facts: [
      { label: "Event", value: data.eventTitle },
      { label: "Club", value: data.clubName },
      { label: "When", value: eventDateTime(data.date, data.time) },
      { label: "Where", value: data.venue },
    ],
    button: { label: "View event", url: data.eventUrl },
    note: "Plans changed? You can withdraw from the event page any time before registration closes.",
    manageUrl: data.manageUrl,
  });
  return { subject: `You're in for ${data.eventTitle}`, html, text, category: "events" };
}

export function eventReminder(data: {
  name: string;
  eventTitle: string;
  clubName: string;
  date: Date;
  time: string;
  venue: string;
  eventUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `${data.eventTitle} is tomorrow`,
    preview: `${eventDateTime(data.date, data.time)} — ${data.venue}`,
    paragraphs: [`Hi ${data.name}, a quick reminder that you're registered for ${data.eventTitle}.`],
    facts: [
      { label: "When", value: eventDateTime(data.date, data.time) },
      { label: "Where", value: data.venue },
      { label: "Club", value: data.clubName },
    ],
    button: { label: "View event", url: data.eventUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Tomorrow: ${data.eventTitle}`, html, text, category: "events" };
}

/**
 * The highest-priority notification in the user stories: someone already
 * registered needs to know the plan moved. Spells out old → new for every
 * field that actually changed rather than a vague "details updated".
 */
export function eventScheduleChange(data: {
  name: string;
  eventTitle: string;
  clubName: string;
  changes: { label: string; from: string; to: string }[];
  date: Date;
  time: string;
  venue: string;
  eventUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `${data.eventTitle} has changed`,
    preview: `Updated details for ${data.eventTitle}.`,
    paragraphs: [
      `Hi ${data.name}, you're registered for ${data.eventTitle} and the ${data.clubName} team just changed the plan.`,
      data.changes.map((c) => `${c.label}: ${c.from} → ${c.to}`).join(" · "),
    ],
    facts: [
      { label: "New date", value: eventDateTime(data.date, data.time) },
      { label: "New venue", value: data.venue },
    ],
    button: { label: "View updated event", url: data.eventUrl },
    note: "If the new time doesn't work for you, you can withdraw from the event page.",
    manageUrl: data.manageUrl,
  });
  return { subject: `Changed: ${data.eventTitle} — new date, time or venue`, html, text, category: "events" };
}

export function registrationClosingSoon(data: {
  name: string;
  eventTitle: string;
  clubName: string;
  date: Date;
  time: string;
  spotsLeft: number;
  eventUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const scarcity =
    data.spotsLeft <= 0
      ? "It's currently full, but spots open up when people withdraw."
      : `Only ${data.spotsLeft} ${data.spotsLeft === 1 ? "spot" : "spots"} left.`;

  const { html, text } = renderLayout({
    heading: `Last chance for ${data.eventTitle}`,
    preview: scarcity,
    paragraphs: [
      `Hi ${data.name}, registration for ${data.eventTitle} is nearly closed. ${scarcity}`,
    ],
    facts: [
      { label: "Club", value: data.clubName },
      { label: "When", value: eventDateTime(data.date, data.time) },
    ],
    button: { label: "Count me in", url: data.eventUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Closing soon: ${data.eventTitle}`, html, text, category: "events" };
}

export function eventCancelled(data: {
  name: string;
  eventTitle: string;
  clubName: string;
  date: Date;
  time: string;
  reason?: string;
  eventsUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `${data.eventTitle} has been cancelled`,
    preview: `${data.eventTitle} is no longer going ahead.`,
    paragraphs: [
      `Hi ${data.name}, ${data.clubName} has cancelled ${data.eventTitle}, scheduled for ${eventDateTime(data.date, data.time)}. Your registration has been released.`,
      ...(data.reason ? [`Reason given: ${data.reason}`] : []),
    ],
    button: { label: "Browse other events", url: data.eventsUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Cancelled: ${data.eventTitle}`, html, text, category: "events" };
}

export function eventApprovalDecision(data: {
  name: string;
  eventTitle: string;
  approved: boolean;
  eventUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: data.approved ? `${data.eventTitle} is approved` : `${data.eventTitle} wasn't approved`,
    preview: data.approved ? "Registrations are open." : "A decision was made on your event.",
    paragraphs: data.approved
      ? [
          `Hi ${data.name}, ${data.eventTitle} has been approved. It's now visible to members and registrations are open.`,
        ]
      : [
          `Hi ${data.name}, ${data.eventTitle} wasn't approved. Check the event page for the current status and talk to your faculty reviewer about what to change.`,
        ],
    button: { label: "View event", url: data.eventUrl },
    manageUrl: data.manageUrl,
  });
  return {
    subject: data.approved ? `Approved: ${data.eventTitle}` : `Not approved: ${data.eventTitle}`,
    html,
    text,
    category: "events",
  };
}

export function facultyEventAwaitingApproval(data: {
  facultyName: string;
  eventTitle: string;
  clubName: string;
  date: Date;
  time: string;
  venue: string;
  approvalsUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `${data.eventTitle} needs your approval`,
    preview: `${data.clubName} submitted an event for review.`,
    paragraphs: [`Hi ${data.facultyName}, ${data.clubName} has submitted an event for your approval.`],
    facts: [
      { label: "Event", value: data.eventTitle },
      { label: "Club", value: data.clubName },
      { label: "When", value: eventDateTime(data.date, data.time) },
      { label: "Where", value: data.venue },
    ],
    button: { label: "Review event", url: data.approvalsUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Approval needed: ${data.eventTitle} (${data.clubName})`, html, text, category: "events" };
}

// --- Tasks -------------------------------------------------------------------

export function taskAssigned(data: {
  name: string;
  taskTitle: string;
  role: string;
  eventTitle: string;
  dueAt: Date | null;
  tasksUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `You've been assigned: ${data.taskTitle}`,
    preview: `${data.role} for ${data.eventTitle}`,
    paragraphs: [`Hi ${data.name}, you've been given a volunteer task for ${data.eventTitle}.`],
    facts: [
      { label: "Task", value: data.taskTitle },
      { label: "Role", value: data.role },
      { label: "Event", value: data.eventTitle },
      { label: "Due", value: data.dueAt ? dueDateTime(data.dueAt) : "No due date" },
    ],
    button: { label: "Open my tasks", url: data.tasksUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `New task: ${data.taskTitle}`, html, text, category: "tasks" };
}

export function taskDueReminder(data: {
  name: string;
  taskTitle: string;
  eventTitle: string;
  dueAt: Date;
  tasksUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `${data.taskTitle} is due tomorrow`,
    preview: dueDateTime(data.dueAt),
    paragraphs: [
      `Hi ${data.name}, your task for ${data.eventTitle} is due ${dueDateTime(data.dueAt)}.`,
    ],
    button: { label: "Open my tasks", url: data.tasksUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Due tomorrow: ${data.taskTitle}`, html, text, category: "tasks" };
}

export function taskOverdue(data: {
  name: string;
  taskTitle: string;
  eventTitle: string;
  dueAt: Date;
  tasksUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `${data.taskTitle} is overdue`,
    preview: `Was due ${dueDateTime(data.dueAt)}.`,
    paragraphs: [
      `Hi ${data.name}, your task for ${data.eventTitle} was due ${dueDateTime(data.dueAt)} and is still open.`,
      "If it's actually done, mark it done so your coordinator isn't chasing it. If you're stuck, say so — someone can pick it up.",
    ],
    button: { label: "Update the task", url: data.tasksUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Overdue: ${data.taskTitle}`, html, text, category: "tasks" };
}

// --- Communication -----------------------------------------------------------

export function announcementNew(data: {
  name: string;
  title: string;
  body: string;
  clubName: string;
  authorName: string;
  announcementsUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: data.title,
    preview: excerpt(data.body, 120),
    paragraphs: [`${data.clubName} · posted by ${data.authorName}`, excerpt(data.body)],
    button: { label: "Read in Sangam", url: data.announcementsUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `[${data.clubName}] ${data.title}`, html, text, category: "announcements" };
}

export function announcementDigest(data: {
  name: string;
  items: { title: string; body: string; clubName: string }[];
  announcementsUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const count = data.items.length;
  const { html, text } = renderLayout({
    heading: count === 1 ? "1 new announcement" : `${count} new announcements`,
    preview: data.items.map((i) => i.title).join(" · "),
    paragraphs: [
      `Hi ${data.name}, here's what your clubs posted since the last digest.`,
      ...data.items.map((item) => `${item.clubName} — ${item.title}: ${excerpt(item.body, 180)}`),
    ],
    button: { label: "Open Sangam", url: data.announcementsUrl },
    note: "High-priority announcements are sent the moment they're posted; everything else arrives here.",
    manageUrl: data.manageUrl,
  });
  return {
    subject: count === 1 ? "Your Sangam digest: 1 new announcement" : `Your Sangam digest: ${count} new announcements`,
    html,
    text,
    category: "announcements",
  };
}

// --- Support -----------------------------------------------------------------

export function issueSubmitted(data: {
  name: string;
  issueTitle: string;
  category: string;
  issuesUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: "We've got your issue",
    preview: data.issueTitle,
    paragraphs: [`Hi ${data.name}, your issue has been logged and the club admins can see it.`],
    facts: [
      { label: "Issue", value: data.issueTitle },
      { label: "Category", value: data.category },
      { label: "Status", value: "Open" },
    ],
    button: { label: "Track this issue", url: data.issuesUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Issue received: ${data.issueTitle}`, html, text, category: "issues" };
}

export function issueStatusChanged(data: {
  name: string;
  issueTitle: string;
  status: string;
  issuesUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `Your issue is now ${data.status}`,
    preview: data.issueTitle,
    paragraphs: [`Hi ${data.name}, there's an update on the issue you raised.`],
    facts: [
      { label: "Issue", value: data.issueTitle },
      { label: "Status", value: data.status },
    ],
    button: { label: "View issue", url: data.issuesUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `${data.issueTitle} — now ${data.status}`, html, text, category: "issues" };
}

export function issueResolved(data: {
  name: string;
  issueTitle: string;
  issuesUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: "Your issue has been resolved",
    preview: data.issueTitle,
    paragraphs: [
      `Hi ${data.name}, the admins have marked "${data.issueTitle}" as resolved.`,
      "If it's still happening, raise a new issue and mention this one so nothing gets lost.",
    ],
    button: { label: "View issue", url: data.issuesUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Resolved: ${data.issueTitle}`, html, text, category: "issues" };
}

export function issueReply(data: {
  name: string;
  issueTitle: string;
  replyAuthor: string;
  replyBody: string;
  issuesUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `${data.replyAuthor} replied to your issue`,
    preview: excerpt(data.replyBody, 120),
    paragraphs: [`On "${data.issueTitle}":`, excerpt(data.replyBody)],
    button: { label: "Reply in Sangam", url: data.issuesUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `New reply on ${data.issueTitle}`, html, text, category: "issues" };
}

// --- Admin -------------------------------------------------------------------

export function handoverConfirmation(data: {
  name: string;
  clubName: string;
  outgoingAdminName: string;
  incomingAdminName: string;
  isIncoming: boolean;
  adminUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: data.isIncoming ? `You're now the admin of ${data.clubName}` : `Admin handover for ${data.clubName} is complete`,
    preview: `${data.outgoingAdminName} → ${data.incomingAdminName}`,
    paragraphs: data.isIncoming
      ? [
          `Hi ${data.name}, ${data.outgoingAdminName} has handed you the admin role for ${data.clubName}.`,
          "You can now approve memberships and events, post announcements, and manage the club's issues board.",
        ]
      : [
          `Hi ${data.name}, your admin role for ${data.clubName} has been transferred to ${data.incomingAdminName}. You're now a coordinator for the club.`,
        ],
    facts: [
      { label: "Club", value: data.clubName },
      { label: "Outgoing admin", value: data.outgoingAdminName },
      { label: "Incoming admin", value: data.incomingAdminName },
    ],
    button: { label: data.isIncoming ? "Open admin dashboard" : "Open Sangam", url: data.adminUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Admin handover: ${data.clubName}`, html, text, category: "membership" };
}

export function roleChanged(data: {
  name: string;
  clubName: string;
  role: string;
  appUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `You're now a ${data.role} for ${data.clubName}`,
    preview: `Your role in ${data.clubName} changed.`,
    paragraphs: [
      `Hi ${data.name}, your role in ${data.clubName} is now ${data.role}. Your dashboard has changed to match.`,
    ],
    button: { label: "Open Sangam", url: data.appUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Your role in ${data.clubName} is now ${data.role}`, html, text, category: "membership" };
}

/**
 * Delivers the GenAI-generated handover brief to the incoming admin. The brief
 * is model-generated prose, so it's escaped and rendered as paragraphs rather
 * than trusted as markup.
 */
export function handoverBrief(data: {
  name: string;
  clubName: string;
  brief: string;
  adminUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const paragraphs = data.brief
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const { html, text } = renderLayout({
    heading: `Your handover brief for ${data.clubName}`,
    preview: "Everything you need to pick up where the last admin left off.",
    paragraphs: [
      `Hi ${data.name}, here's the handover brief for ${data.clubName}, generated from the club's current events, members, tasks and open issues.`,
      ...paragraphs,
    ],
    button: { label: "Open admin dashboard", url: data.adminUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Handover brief: ${data.clubName}`, html, text, category: "membership" };
}

// --- Provisioning ------------------------------------------------------------

export function clubRequestSubmitted(data: {
  name: string;
  clubName: string;
  requestsUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `Your proposal for ${data.clubName} is in`,
    preview: "Faculty will review it shortly.",
    paragraphs: [
      `Hi ${data.name}, thanks for proposing ${data.clubName}. A faculty reviewer will take a look and you'll hear back either way.`,
      "If it's approved you become the club's first admin, so you can add members, appoint coordinators and start running events straight away.",
    ],
    button: { label: "Track my request", url: data.requestsUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Club proposal received: ${data.clubName}`, html, text, category: "membership" };
}

export function clubRequestAwaitingReview(data: {
  facultyName: string;
  clubName: string;
  requesterName: string;
  requesterEmail: string;
  category: string;
  tagline: string;
  reviewUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `${data.requesterName} wants to start ${data.clubName}`,
    preview: "A club proposal is waiting for review.",
    paragraphs: [`Hi ${data.facultyName}, a new club proposal needs a decision.`],
    facts: [
      { label: "Club", value: data.clubName },
      { label: "Tagline", value: data.tagline },
      { label: "Category", value: data.category },
      { label: "Proposed by", value: `${data.requesterName} (${data.requesterEmail})` },
    ],
    button: { label: "Review proposal", url: data.reviewUrl },
    note: "Approving creates the club and makes the proposer its first admin.",
    manageUrl: data.manageUrl,
  });
  return { subject: `Club proposal: ${data.clubName}`, html, text, category: "membership" };
}

export function clubRequestApproved(data: {
  name: string;
  clubName: string;
  adminUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `${data.clubName} is live — and you're its admin`,
    preview: `Your proposal for ${data.clubName} was approved.`,
    paragraphs: [
      `Hi ${data.name}, faculty approved ${data.clubName}. It now exists on Sangam and you're its admin.`,
      "Start by adding members and appointing a coordinator or two, then create your first event. Events go to faculty for approval before registration opens.",
    ],
    button: { label: "Open admin dashboard", url: data.adminUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Approved: ${data.clubName} is live on Sangam`, html, text, category: "membership" };
}

export function clubRequestRejected(data: {
  name: string;
  clubName: string;
  note?: string;
  clubsUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: `Update on your ${data.clubName} proposal`,
    preview: `A decision was made on ${data.clubName}.`,
    paragraphs: [
      `Hi ${data.name}, faculty weren't able to approve ${data.clubName} this time.`,
      ...(data.note ? [`What they said: ${data.note}`] : []),
      "You're welcome to propose again with a revised plan, or join one of the clubs already running.",
    ],
    button: { label: "Browse clubs", url: data.clubsUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: `Update on your ${data.clubName} proposal`, html, text, category: "membership" };
}

export function facultyAccessGranted(data: {
  name: string;
  grantedByName: string;
  facultyUrl: string;
  manageUrl: string;
}): RenderedEmail {
  const { html, text } = renderLayout({
    heading: "You now have faculty access",
    preview: "Event approvals and club oversight are open to you.",
    paragraphs: [
      `Hi ${data.name}, ${data.grantedByName} has given your account faculty access on Sangam.`,
      "That means you review and approve events across every club, see club activity, and can appoint other faculty. Clubs can't open registration for an event until a faculty reviewer approves it, so your queue matters.",
    ],
    button: { label: "Open faculty dashboard", url: data.facultyUrl },
    manageUrl: data.manageUrl,
  });
  return { subject: "You now have faculty access on Sangam", html, text, category: "membership" };
}
