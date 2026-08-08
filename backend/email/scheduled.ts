import { prisma } from "@/backend/db/prisma";
import { sendEmails, summarize, type SendEmailInput } from "@/backend/email/client";
import { emailLinks, manageUrlFor } from "@/backend/email/routes";
import { AUDIENCE_ROLES, eventRegistrantRecipients, type Recipient } from "@/backend/email/recipients";
import * as templates from "@/backend/email/templates";
import { parseNotificationPrefs } from "@/lib/notification-prefs";

/**
 * Time-based email. Everything here is a sweep: it asks "who is owed mail right
 * now", not "what just happened", so it runs from cron rather than a mutation.
 *
 * Two rules make these safe to run repeatedly, which matters because Vercel
 * Cron retries and because a deploy can overlap a run:
 *
 *   1. Dedupe keys name the *target*, never the run — `reminder:<eventId>:<userId>`
 *      not `reminder:<timestamp>`. Running the sweep five times mails once.
 *   2. Windows are calendar days, so a sweep that fires late still covers the
 *      same set of rows instead of silently skipping a band of them.
 *
 * `now` is injectable so tests can drive the windows without waiting a day.
 */

export type SweepSummary = ReturnType<typeof summarize> & { candidates: number };

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** YYYY-MM-DD in local time, for keys that should recur at most once a day. */
function dayKey(date: Date): string {
  return startOfDay(date).toISOString().slice(0, 10);
}

async function runSweep(inputs: SendEmailInput[]): Promise<SweepSummary> {
  const results = await sendEmails(inputs);
  return { ...summarize(results), candidates: inputs.length };
}

/**
 * "Your event is tomorrow", for everyone registered. Scoped to the next
 * calendar day rather than a rolling 24h window so a daily cron can't leave a
 * gap: whatever time it fires, it covers all of tomorrow.
 */
export async function runEventReminders(now = new Date()): Promise<SweepSummary> {
  const tomorrow = startOfDay(addDays(now, 1));
  const dayAfter = addDays(tomorrow, 1);

  const events = await prisma.event.findMany({
    where: {
      date: { gte: tomorrow, lt: dayAfter },
      status: { not: "past" },
      approval: { not: "rejected" },
    },
    include: { club: { select: { name: true } } },
  });

  const inputs: SendEmailInput[] = [];
  for (const event of events) {
    for (const person of await eventRegistrantRecipients(event.id)) {
      inputs.push({
        to: person.email,
        userId: person.userId,
        prefsJson: person.prefsJson,
        template: "eventReminder",
        rendered: templates.eventReminder({
          name: person.name,
          eventTitle: event.title,
          clubName: event.club.name,
          date: event.date,
          time: event.time,
          venue: event.venue,
          eventUrl: emailLinks.event(event.slug),
          manageUrl: manageUrlFor(person.userId, "events"),
        }),
        dedupeKey: `eventReminder:${event.id}:${person.userId}`,
      });
    }
  }

  return runSweep(inputs);
}

/** "Your task is due tomorrow", for open tasks only. */
export async function runTaskDueReminders(now = new Date()): Promise<SweepSummary> {
  const tomorrow = startOfDay(addDays(now, 1));
  const dayAfter = addDays(tomorrow, 1);

  const tasks = await prisma.task.findMany({
    where: {
      dueAt: { gte: tomorrow, lt: dayAfter },
      status: { not: "done" },
    },
    include: {
      event: { select: { title: true } },
      assignee: { select: { id: true, name: true, email: true, notificationPrefs: true } },
    },
  });

  const inputs = tasks.map((task) => ({
    to: task.assignee.email,
    userId: task.assignee.id,
    prefsJson: task.assignee.notificationPrefs,
    template: "taskDueReminder" as const,
    rendered: templates.taskDueReminder({
      name: task.assignee.name,
      taskTitle: task.title,
      eventTitle: task.event.title,
      dueAt: task.dueAt!,
      tasksUrl: emailLinks.volunteerTasks(),
      manageUrl: manageUrlFor(task.assignee.id, "tasks"),
    }),
    // Includes the due date, so moving a deadline earns a fresh reminder.
    dedupeKey: `taskDue:${task.id}:${dayKey(task.dueAt!)}`,
  }));

  return runSweep(inputs);
}

const OVERDUE_NUDGE_DAYS = 14;

/**
 * Nudges assignees about tasks that slipped. Recurs daily (the key carries the
 * day) but gives up after two weeks — past that it's nagging, not nudging, and
 * the task clearly needs a coordinator rather than another email.
 */
export async function runTaskOverdueNudges(now = new Date()): Promise<SweepSummary> {
  const today = startOfDay(now);
  const cutoff = addDays(today, -OVERDUE_NUDGE_DAYS);

  const tasks = await prisma.task.findMany({
    where: {
      dueAt: { lt: today, gte: cutoff },
      status: { not: "done" },
    },
    include: {
      event: { select: { title: true } },
      assignee: { select: { id: true, name: true, email: true, notificationPrefs: true } },
    },
  });

  const inputs = tasks.map((task) => ({
    to: task.assignee.email,
    userId: task.assignee.id,
    prefsJson: task.assignee.notificationPrefs,
    template: "taskOverdue" as const,
    rendered: templates.taskOverdue({
      name: task.assignee.name,
      taskTitle: task.title,
      eventTitle: task.event.title,
      dueAt: task.dueAt!,
      tasksUrl: emailLinks.volunteerTasks(),
      manageUrl: manageUrlFor(task.assignee.id, "tasks"),
    }),
    dedupeKey: `taskOverdue:${task.id}:${dayKey(now)}`,
  }));

  return runSweep(inputs);
}

const CLOSING_SOON_DAYS = 3;
const NEARLY_FULL_RATIO = 0.15;

/**
 * "Last chance" for members who haven't registered yet — either the event is
 * days away or it's nearly full. Deliberately excludes people already
 * registered: they get the reminder sweep instead.
 */
export async function runRegistrationClosingSoon(now = new Date()): Promise<SweepSummary> {
  const horizon = addDays(startOfDay(now), CLOSING_SOON_DAYS + 1);

  const events = await prisma.event.findMany({
    where: {
      date: { gt: now, lt: horizon },
      status: "upcoming",
      approval: "approved",
      registrationLocked: false,
    },
    include: {
      club: { select: { id: true, name: true } },
      _count: { select: { countMeIns: true } },
    },
  });

  const inputs: SendEmailInput[] = [];

  for (const event of events) {
    const spotsLeft = Math.max(0, event.capacity - event._count.countMeIns);
    const nearlyFull = event.capacity > 0 && spotsLeft / event.capacity <= NEARLY_FULL_RATIO;
    const closingSoon = event.date.getTime() - now.getTime() <= CLOSING_SOON_DAYS * 24 * 60 * 60 * 1000;
    if (!nearlyFull && !closingSoon) continue;

    const [members, registered] = await Promise.all([
      prisma.membership.findMany({
        where: { clubId: event.club.id, status: "Active", role: { in: AUDIENCE_ROLES.All } },
        include: { user: { select: { email: true, name: true, notificationPrefs: true } } },
      }),
      prisma.countMeIn.findMany({ where: { eventId: event.id }, select: { userId: true } }),
    ]);

    const registeredIds = new Set(registered.map((r) => r.userId));

    for (const membership of members) {
      if (registeredIds.has(membership.userId)) continue;
      inputs.push({
        to: membership.user.email,
        userId: membership.userId,
        prefsJson: membership.user.notificationPrefs,
        template: "registrationClosingSoon",
        rendered: templates.registrationClosingSoon({
          name: membership.user.name,
          eventTitle: event.title,
          clubName: event.club.name,
          date: event.date,
          time: event.time,
          spotsLeft,
          eventUrl: emailLinks.event(event.slug),
          manageUrl: manageUrlFor(membership.userId, "events"),
        }),
        dedupeKey: `closingSoon:${event.id}:${membership.userId}`,
      });
    }
  }

  return runSweep(inputs);
}

/**
 * The Low/Med announcement digest — the other half of the "don't over-notify"
 * rule. High priority already mailed immediately (see notifyAnnouncement), so
 * this sweep deliberately excludes it rather than repeating it.
 *
 * One email per recipient covering all their clubs, keyed by day so a retry
 * can't double-send and a recipient can't get two digests for one window.
 */
export async function runAnnouncementDigest(now = new Date(), windowHours = 24): Promise<SweepSummary> {
  const since = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

  const announcements = await prisma.announcement.findMany({
    where: { createdAt: { gte: since, lte: now }, priority: { in: ["Low", "Med"] } },
    include: { club: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (announcements.length === 0) return { sent: 0, dryRun: 0, skipped: 0, failed: 0, duplicate: 0, candidates: 0 };

  const clubIds = [...new Set(announcements.map((a) => a.clubId))];
  const memberships = await prisma.membership.findMany({
    where: { clubId: { in: clubIds }, status: "Active" },
    include: { user: { select: { email: true, name: true, notificationPrefs: true } } },
  });

  // userId -> { recipient, items }. Built in one pass so a member of three
  // clubs gets one digest, not three.
  const perUser = new Map<string, { recipient: Recipient; items: { title: string; body: string; clubName: string }[] }>();

  for (const announcement of announcements) {
    const eligibleRoles = AUDIENCE_ROLES[announcement.audience];
    const targeted = announcement.recipientUserIds.length > 0;
    const targetedIds = targeted ? new Set(announcement.recipientUserIds) : null;

    for (const membership of memberships) {
      if (membership.clubId !== announcement.clubId) continue;
      if (targetedIds) {
        if (!targetedIds.has(membership.userId)) continue;
      } else if (!eligibleRoles.includes(membership.role)) {
        continue;
      }
      if (membership.userId === announcement.authorId) continue;

      const prefs = parseNotificationPrefs(membership.user.notificationPrefs);
      if (!prefs.emailAnnouncements) continue;
      if (prefs.pinnedAnnouncementsOnly && !announcement.pinned) continue;

      const existing = perUser.get(membership.userId);
      const item = { title: announcement.title, body: announcement.body, clubName: announcement.club.name };

      if (existing) {
        existing.items.push(item);
      } else {
        perUser.set(membership.userId, {
          recipient: {
            userId: membership.userId,
            email: membership.user.email,
            name: membership.user.name,
            prefsJson: membership.user.notificationPrefs,
            role: membership.role,
          },
          items: [item],
        });
      }
    }
  }

  const inputs: SendEmailInput[] = [...perUser.values()].map(({ recipient, items }) => ({
    to: recipient.email,
    userId: recipient.userId,
    prefsJson: recipient.prefsJson,
    template: "announcementDigest" as const,
    rendered: templates.announcementDigest({
      name: recipient.name,
      items,
      announcementsUrl: emailLinks.app(),
      manageUrl: manageUrlFor(recipient.userId, "announcements"),
    }),
    dedupeKey: `announcementDigest:${recipient.userId}:${dayKey(now)}`,
  }));

  return runSweep(inputs);
}

export const SWEEPS = {
  "event-reminders": runEventReminders,
  "task-due-reminders": runTaskDueReminders,
  "task-overdue": runTaskOverdueNudges,
  "registration-closing-soon": runRegistrationClosingSoon,
  "announcement-digest": runAnnouncementDigest,
} as const;

export type SweepName = keyof typeof SWEEPS;
