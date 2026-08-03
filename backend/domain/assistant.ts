import { prisma } from "@/backend/db/prisma";
import type { SessionMembership } from "@/backend/auth/session-cookies";
import { formatEventDate, formatTaskDue } from "@/lib/format";

export type AssistantSourceType = "event" | "task" | "announcement" | "membership";

export type AssistantAnswer = {
  answer: string;
  sourceType: AssistantSourceType | null;
  sourceLabel?: string;
  sourceHref?: string;
};

export type AssistantSessionUser = {
  id: string;
  isFaculty: boolean;
  memberships: SessionMembership[];
};

const NO_MATCH_ANSWER: AssistantAnswer = {
  answer:
    "I couldn't match that to something I know how to answer yet. Try asking about your next event, your open tasks, pending approvals, recent announcements, or your club memberships.",
  sourceType: null,
};

function homePathFor(user: AssistantSessionUser): string {
  if (user.isFaculty) return "/faculty";
  const roles = new Set(user.memberships.map((m) => m.role));
  if (roles.has("Admin")) return "/admin";
  if (roles.has("Coordinator")) return "/coordinator";
  if (roles.has("Volunteer")) return "/volunteer";
  return "/app";
}

async function answerApprovals(user: AssistantSessionUser): Promise<AssistantAnswer> {
  if (user.isFaculty) {
    const pending = await prisma.event.findMany({
      where: { approval: "pending" },
      orderBy: { date: "asc" },
      take: 1,
      include: { club: true },
    });
    const count = await prisma.event.count({ where: { approval: "pending" } });
    if (count === 0) {
      return { answer: "No events are waiting on your approval right now.", sourceType: "event", sourceHref: "/faculty/approvals" };
    }
    const next = pending[0];
    return {
      answer: `You have ${count} event${count === 1 ? "" : "s"} awaiting your approval. The soonest is "${next.title}" (${next.club.name}, ${formatEventDate(next.date)}).`,
      sourceType: "event",
      sourceLabel: next.title,
      sourceHref: `/faculty/approvals/${next.slug}`,
    };
  }

  const adminClubIds = user.memberships.filter((m) => m.role === "Admin").map((m) => m.clubId);
  if (adminClubIds.length > 0) {
    const count = await prisma.membership.count({ where: { clubId: { in: adminClubIds }, status: "Pending" } });
    if (count === 0) {
      return { answer: "Your membership approval queue is empty. Inbox zero.", sourceType: "membership", sourceHref: "/admin/approvals" };
    }
    return {
      answer: `You have ${count} pending membership request${count === 1 ? "" : "s"} across your club${adminClubIds.length === 1 ? "" : "s"}.`,
      sourceType: "membership",
      sourceHref: "/admin/approvals",
    };
  }

  const coordinatorClubIds = user.memberships.filter((m) => m.role === "Coordinator").map((m) => m.clubId);
  if (coordinatorClubIds.length > 0) {
    const count = await prisma.event.count({ where: { clubId: { in: coordinatorClubIds }, approval: "pending" } });
    if (count === 0) {
      return { answer: "None of your club's events are waiting on faculty approval right now.", sourceType: "event", sourceHref: "/coordinator" };
    }
    return {
      answer: `${count} of your club's event${count === 1 ? " is" : "s are"} still waiting on faculty approval.`,
      sourceType: "event",
      sourceHref: "/coordinator",
    };
  }

  return {
    answer: "Approvals aren't part of your role — that's handled by club admins, coordinators, and faculty.",
    sourceType: null,
  };
}

async function answerTasks(user: AssistantSessionUser): Promise<AssistantAnswer> {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: user.id, status: { not: "done" } },
    include: { event: true },
    orderBy: [{ dueAt: "asc" }],
    take: 3,
  });

  const href = homePathFor(user);

  if (tasks.length === 0) {
    return { answer: "You have no open tasks right now.", sourceType: "task", sourceHref: href };
  }

  const [soonest] = tasks;
  const summary =
    tasks.length === 1
      ? `You have 1 open task: "${soonest.title}" for ${soonest.event.title} (${formatTaskDue(soonest.dueAt)}).`
      : `You have ${tasks.length} open tasks. The next one is "${soonest.title}" for ${soonest.event.title} (${formatTaskDue(soonest.dueAt)}).`;

  return { answer: summary, sourceType: "task", sourceLabel: soonest.title, sourceHref: href };
}

async function answerNextEvent(user: AssistantSessionUser): Promise<AssistantAnswer> {
  const clubIds = user.memberships.map((m) => m.clubId);
  const where = clubIds.length > 0 ? { clubId: { in: clubIds }, date: { gte: new Date() } } : { date: { gte: new Date() } };

  const event = await prisma.event.findFirst({
    where,
    orderBy: { date: "asc" },
    include: { club: true },
  });

  if (!event) {
    return { answer: "You don't have any upcoming events on your calendar.", sourceType: "event", sourceHref: `${homePathFor(user)}` };
  }

  const memberHref =
    user.memberships.some((m) => m.role === "Coordinator" && m.clubId === event.clubId)
      ? `/coordinator/events/${event.slug}`
      : `/app/events/${event.slug}`;

  return {
    answer: `Your next event is "${event.title}" on ${formatEventDate(event.date)} at ${event.time}, ${event.venue} (${event.club.name}).`,
    sourceType: "event",
    sourceLabel: event.title,
    sourceHref: memberHref,
  };
}

async function answerAnnouncements(user: AssistantSessionUser): Promise<AssistantAnswer> {
  const clubIds = user.memberships.map((m) => m.clubId);
  const announcement = await prisma.announcement.findFirst({
    where: clubIds.length > 0 ? { OR: [{ clubId: { in: clubIds } }, { audience: "All" }] } : { audience: "All" },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: { club: true },
  });

  if (!announcement) {
    return { answer: "There are no announcements for you right now.", sourceType: "announcement", sourceHref: homePathFor(user) };
  }

  const snippet = announcement.body.length > 140 ? `${announcement.body.slice(0, 140).trimEnd()}…` : announcement.body;

  return {
    answer: `${announcement.pinned ? "Pinned: " : ""}"${announcement.title}" from ${announcement.club.name} — ${snippet}`,
    sourceType: "announcement",
    sourceLabel: announcement.title,
    sourceHref: homePathFor(user),
  };
}

function answerMemberships(user: AssistantSessionUser): AssistantAnswer {
  if (user.memberships.length === 0) {
    return {
      answer: user.isFaculty
        ? "You're set up as institution-wide faculty oversight, not tied to a specific club membership."
        : "You don't have any club memberships yet — browse clubs to join one.",
      sourceType: "membership",
      sourceHref: user.isFaculty ? "/faculty" : "/app/clubs",
    };
  }

  const lines = user.memberships.map((m) => `${m.clubName} (${m.role})`).join(", ");
  return {
    answer: `You're a member of: ${lines}.`,
    sourceType: "membership",
    sourceHref: "/app/profile",
  };
}

const KEYWORD_HANDLERS: Array<{ keywords: string[]; handle: (user: AssistantSessionUser) => Promise<AssistantAnswer> | AssistantAnswer }> = [
  { keywords: ["approval", "approve", "pending"], handle: answerApprovals },
  { keywords: ["task", "todo", "to do", "assigned"], handle: answerTasks },
  { keywords: ["event", "next", "upcoming", "schedule", "calendar"], handle: answerNextEvent },
  { keywords: ["announcement", "pinned", "news"], handle: answerAnnouncements },
  { keywords: ["membership", "club", "role", "status"], handle: answerMemberships },
];

export async function answerAssistantQuery(user: AssistantSessionUser, rawQuery: string): Promise<AssistantAnswer> {
  const query = rawQuery.toLowerCase();

  for (const { keywords, handle } of KEYWORD_HANDLERS) {
    if (keywords.some((keyword) => query.includes(keyword))) {
      return handle(user);
    }
  }

  return NO_MATCH_ANSWER;
}
