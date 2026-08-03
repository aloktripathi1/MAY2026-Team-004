import { z } from "zod/v4";
import { prisma } from "@/backend/db/prisma";
import type { SessionMembership } from "@/backend/auth/session-cookies";
import { formatEventDate, formatTaskDue } from "@/lib/format";
import { GenAiError, structuredCompletion, textCompletion } from "@/lib/genai";

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

const NO_DATA_ANSWER: AssistantAnswer = {
  answer: "I don't have that information.",
  sourceType: null,
};

const FALLBACK_ANSWER: AssistantAnswer = {
  answer: "Ask Sangam is temporarily unavailable. Please try again in a moment.",
  sourceType: null,
};

const classificationSchema = z.object({
  intent: z.enum(["event_lookup", "task_lookup", "announcement_lookup", "membership_status", "unrelated"]),
  entities: z
    .object({
      // A specific event, club, or topic the question names — applies across
      // all four intents (a named event for event/task lookups, a named
      // club for membership/announcement lookups, a topic keyword for
      // announcements). Omitted for generic questions like "what's on my
      // task list" that don't name anything specific.
      subject: z.string().nullable().optional(),
    })
    .default({}),
});

type Classification = z.infer<typeof classificationSchema>;

const CLASSIFY_SYSTEM_PROMPT = `You are the intent classifier for "Ask Sangam", a Q&A assistant embedded in a student clubs platform. It can only answer questions about the requesting user's own events, tasks, announcements, or club memberships — nothing else.

Classify the user's question into exactly one intent:
- "event_lookup": questions about events, schedules, "next event", a specific event by name, registration/capacity status.
- "task_lookup": questions about the user's own assigned tasks, to-dos, or volunteer shifts.
- "announcement_lookup": questions about club announcements, news, or updates.
- "membership_status": questions about the user's own club memberships, roles, or membership status.
- "unrelated": the question is NOT about any of the above — general knowledge, small talk, greetings, unrelated topics, or anything this app has no data for. Use this whenever the question doesn't genuinely fit one of the four categories above. Do not force a fit just because a keyword loosely overlaps.

If the question names a specific event, club, or topic (e.g. "tasks for the Winter Fest", "announcement about the hackathon", "am I a member of Paradox"), extract it as entities.subject. Omit it for generic questions ("what's on my task list", "what are the latest announcements").
Return ONLY the structured JSON output. No prose, no markdown, no explanation.`;

const GENERATE_SYSTEM_PROMPT = `You are "Ask Sangam", answering a user's question using ONLY the JSON data provided below.

Rules:
- Use only the facts present in the provided data. Never add names, dates, numbers, or details that aren't in it.
- If the data doesn't actually answer the question — including if the data is simply unrelated to what was asked — respond with exactly this sentence and nothing else: "I don't have that information." Do not soften it, explain why, or add anything else.
- Otherwise keep the answer short: one or two sentences, natural and conversational, no markdown formatting.`;

function scopedClubIds(user: AssistantSessionUser): string[] {
  return user.memberships.map((m) => m.clubId);
}

async function classify(question: string): Promise<Classification> {
  return structuredCompletion({
    system: CLASSIFY_SYSTEM_PROMPT,
    prompt: question,
    schema: classificationSchema,
  });
}

async function generate(question: string, data: unknown): Promise<string> {
  const prompt = `User question: "${question}"\n\nData:\n${JSON.stringify(data, null, 2)}`;
  return textCompletion({ system: GENERATE_SYSTEM_PROMPT, prompt, maxTokens: 300 });
}

/**
 * Wraps a generate() call with its source metadata — but if Claude decides
 * on reflection that the retrieved data doesn't actually address the
 * question (its only allowed way to say so is the fixed no-data sentence),
 * the source tag is dropped too so the UI never shows an EVENT/TASK/etc.
 * badge next to an "I don't have that information" answer.
 */
async function generateAnswer(
  question: string,
  data: unknown,
  source: { sourceType: AssistantSourceType; sourceLabel?: string; sourceHref: string },
): Promise<AssistantAnswer> {
  const answer = await generate(question, data);
  if (answer === NO_DATA_ANSWER.answer) return NO_DATA_ANSWER;
  return { answer, ...source };
}

async function handleEventLookup(user: AssistantSessionUser, entities: Classification["entities"]): Promise<AssistantAnswer> {
  const clubIds = scopedClubIds(user);
  // Non-faculty users only ever see events for clubs they actually belong to
  // — a Member of one club can never pull another club's event data through
  // this endpoint. Faculty are institution-wide oversight by design (same
  // access as /faculty/approvals elsewhere in the app), so they aren't
  // club-scoped here either.
  if (!user.isFaculty && clubIds.length === 0) return NO_DATA_ANSWER;

  const scopeFilter = clubIds.length > 0 ? { clubId: { in: clubIds } } : {};
  const nameFilter = entities.subject
    ? {
        status: { not: "past" as const },
        OR: [
          { title: { contains: entities.subject, mode: "insensitive" as const } },
          { club: { name: { contains: entities.subject, mode: "insensitive" as const } } },
        ],
      }
    : { date: { gte: new Date() } };

  const events = await prisma.event.findMany({
    where: { AND: [scopeFilter, nameFilter] },
    include: { club: true },
    orderBy: { date: "asc" },
    take: 3,
  });

  if (events.length === 0) return NO_DATA_ANSWER;

  const data = events.map((e) => ({
    title: e.title,
    club: e.club.name,
    date: formatEventDate(e.date),
    time: e.time,
    venue: e.venue,
    capacity: e.capacity,
    going: e.going,
    status: e.status,
  }));

  return generateAnswer(entities.subject ?? "next event", data, {
    sourceType: "event",
    sourceLabel: events[0].title,
    sourceHref: user.memberships.some((m) => m.role === "Coordinator" && m.clubId === events[0].clubId)
      ? `/coordinator/events/${events[0].slug}`
      : `/app/events/${events[0].slug}`,
  });
}

async function handleTaskLookup(user: AssistantSessionUser, entities: Classification["entities"]): Promise<AssistantAnswer> {
  // Scoped to the requester's own assigned tasks only.
  const subjectFilter = entities.subject
    ? {
        event: {
          OR: [
            { title: { contains: entities.subject, mode: "insensitive" as const } },
            { club: { name: { contains: entities.subject, mode: "insensitive" as const } } },
          ],
        },
      }
    : {};

  const tasks = await prisma.task.findMany({
    where: { assigneeId: user.id, status: { not: "done" }, ...subjectFilter },
    include: { event: true },
    orderBy: [{ dueAt: "asc" }],
    take: 3,
  });

  // A named subject that matches nothing is a hard "no" — never fall back
  // to the requester's unrelated real tasks just because they have some.
  if (tasks.length === 0) return NO_DATA_ANSWER;

  const data = tasks.map((t) => ({
    title: t.title,
    event: t.event.title,
    dueAt: formatTaskDue(t.dueAt),
    status: t.status,
    priority: t.priority,
  }));

  return generateAnswer(entities.subject ?? "my tasks", data, {
    sourceType: "task",
    sourceLabel: tasks[0].title,
    sourceHref: user.isFaculty ? "/faculty" : user.memberships.some((m) => m.role === "Coordinator") ? "/coordinator" : "/volunteer",
  });
}

async function handleAnnouncementLookup(user: AssistantSessionUser, entities: Classification["entities"]): Promise<AssistantAnswer> {
  const clubIds = scopedClubIds(user);
  const scopeFilter = clubIds.length > 0 ? { OR: [{ clubId: { in: clubIds } }, { audience: "All" as const }] } : { audience: "All" as const };
  const subjectFilter = entities.subject
    ? {
        OR: [
          { title: { contains: entities.subject, mode: "insensitive" as const } },
          { body: { contains: entities.subject, mode: "insensitive" as const } },
          { club: { name: { contains: entities.subject, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const announcements = await prisma.announcement.findMany({
    where: { AND: [scopeFilter, subjectFilter] },
    include: { club: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 3,
  });

  // A named topic that matches nothing is a hard "no" — never fall back to
  // generic latest announcements just because some exist.
  if (announcements.length === 0) return NO_DATA_ANSWER;

  const data = announcements.map((a) => ({
    title: a.title,
    club: a.club.name,
    body: a.body,
    pinned: a.pinned,
  }));

  return generateAnswer(entities.subject ?? "latest announcements", data, {
    sourceType: "announcement",
    sourceLabel: announcements[0].title,
    sourceHref: user.isFaculty ? "/faculty" : "/app",
  });
}

async function handleMembershipStatus(user: AssistantSessionUser, entities: Classification["entities"]): Promise<AssistantAnswer> {
  // Always scoped to the requester's own userId — never another user's memberships.
  const allMemberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { club: true },
  });

  // A specific club named that the user isn't actually in is a hard "no" —
  // never fall back to listing their real, unrelated memberships instead.
  const memberships = entities.subject
    ? allMemberships.filter((m) => m.club.name.toLowerCase().includes(entities.subject!.toLowerCase()))
    : allMemberships;

  if (memberships.length === 0 && !(user.isFaculty && !entities.subject)) return NO_DATA_ANSWER;

  const data = user.isFaculty
    ? { isFaculty: true, memberships: memberships.map((m) => ({ club: m.club.name, role: m.role, status: m.status })) }
    : { memberships: memberships.map((m) => ({ club: m.club.name, role: m.role, status: m.status })) };

  return generateAnswer(entities.subject ?? "my membership status", data, {
    sourceType: "membership",
    sourceLabel: memberships[0]?.club.name,
    sourceHref: "/app/profile",
  });
}

export async function answerAssistantQuery(user: AssistantSessionUser, question: string): Promise<AssistantAnswer> {
  let classification: Classification;
  try {
    classification = await classify(question);
  } catch (error) {
    console.error("[assistant] classification failed", error instanceof GenAiError ? error.message : error);
    return FALLBACK_ANSWER;
  }

  try {
    switch (classification.intent) {
      case "event_lookup":
        return await handleEventLookup(user, classification.entities);
      case "task_lookup":
        return await handleTaskLookup(user, classification.entities);
      case "announcement_lookup":
        return await handleAnnouncementLookup(user, classification.entities);
      case "membership_status":
        return await handleMembershipStatus(user, classification.entities);
      case "unrelated":
        return NO_DATA_ANSWER;
    }
  } catch (error) {
    if (error instanceof GenAiError) {
      console.error("[assistant] generation failed", error.message);
      return FALLBACK_ANSWER;
    }
    throw error;
  }
}
