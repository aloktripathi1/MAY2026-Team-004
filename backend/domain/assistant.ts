import { z } from "zod/v4";
import { Prisma } from "@prisma/client";
import { prisma } from "@/backend/db/prisma";
import { runWriteToolAgent } from "@/backend/assistant/agent/run-write-agent";
import type { AppRole } from "@/backend/auth/roles";
import { formatEventDate, formatTaskDue } from "@/lib/format";
import { GenAiError, structuredCompletion, textCompletion } from "@/lib/genai";
import type { AssistantAnswer, AssistantSessionUser, AssistantSourceType } from "@/backend/domain/assistant-types";

export type { AssistantAnswer, AssistantSessionUser, AssistantSourceType };

const NO_DATA_ANSWER: AssistantAnswer = {
  answer: "I don't have that information.",
  sourceType: null,
};

const FALLBACK_ANSWER: AssistantAnswer = {
  answer: "Ask Sangam is temporarily unavailable. Please try again in a moment.",
  sourceType: null,
};

const UNSUPPORTED_ACTION_ANSWER: AssistantAnswer = {
  answer:
    "I can't make that kind of change. I can look up your events, tasks, announcements, and membership status — and from the right role view I can update task status (volunteer/coordinator), assign or bulk-assign tasks (coordinator), or draft announcements (admin). Creating or cancelling events, approving members, and changing roles still need the relevant dashboard page.",
  sourceType: null,
};

const TASK_STATUS_WRONG_SHELL: AssistantAnswer = {
  answer:
    "Updating task status isn't available in this role view. Switch to Volunteer for your own tasks, or Coordinator for the club board.",
  sourceType: null,
};

const TASK_ASSIGN_WRONG_SHELL: AssistantAnswer = {
  answer: "Assigning tasks is only available in the Coordinator view.",
  sourceType: null,
};

const BULK_WRITE_WRONG_SHELL: AssistantAnswer = {
  answer: "Bulk task assignment is only available in the Coordinator view.",
  sourceType: null,
};

const ANNOUNCE_WRITE_WRONG_SHELL: AssistantAnswer = {
  answer: "Posting announcements is only available in the Admin view.",
  sourceType: null,
};

const classificationSchema = z.object({
  intent: z.enum([
    "event_lookup",
    "task_lookup",
    "task_action",
    "task_assign",
    "bulk_task_assign",
    "announcement_lookup",
    "announcement_action",
    "membership_status",
    "unsupported_action",
    "unrelated",
  ]),
  entities: z
    .object({
      subject: z.string().nullable().optional(),
      timeframe: z.enum(["upcoming", "past"]).nullable().optional(),
      wantsCount: z.boolean().nullable().optional(),
    })
    .default({}),
});

type Classification = z.infer<typeof classificationSchema>;

const CLASSIFY_SYSTEM_PROMPT = `You are the intent classifier for "Ask Sangam", a Q&A and action assistant embedded in a student clubs platform. It can answer questions about the requesting user's own events, tasks, announcements, or club memberships. It can also propose certain writes that the user must Accept in the UI: task status updates (volunteer/coordinator), single and bulk task assignment (coordinator only), and posting announcements (admin only). Volunteers cannot assign or bulk-assign. Admins cannot change tasks.

Classify the user's question into exactly one intent:
- "event_lookup": questions about events, schedules, "next event", a specific event by name, registration/capacity status, or anything happening/coming up in a given timeframe ("what's happening this week", "what's on today", "anything coming up soon"). These generic timeframe questions ARE event_lookup even though they don't name a specific event — treat "this week" / "today" / "soon" as a timeframe signal, not a reason to call it unrelated.
- "task_lookup": READ-ONLY questions about the user's own assigned tasks, to-dos, or volunteer shifts ("what's on my task list", "what tasks do I have", "is my poster task still open"). Do NOT use this when the user wants to change something.
- "task_action": the user wants to CHANGE a task's STATUS only — mark/set status to todo/doing/done — e.g. "mark my poster task as done", "change the first task status to doing", "mark Booth setup as doing". NOT assign, NOT bulk.
- "task_assign": the user wants to CREATE/ASSIGN ONE task to one person — e.g. "assign booth setup to Sai for Test Event 1", "assign check-in to Pardhiv for Test Event 1". Not bulk/multi-person. Coordinator shell only.
- "bulk_task_assign": the user wants to ASSIGN multiple tasks / assign tasks to several people / expand "all volunteers" into assignments — e.g. "assign poster to Soham and booth to Sai for TechFest", "give all volunteers check-in duty for Winter Fest". Coordinator shell only.
- "announcement_lookup": READ-ONLY questions about club announcements, news, or updates.
- "announcement_action": the user wants to DRAFT or POST an announcement — e.g. "draft an announcement about the hackathon for all volunteers", "post a high priority notice that rehearsal is cancelled". Admin shell only.
- "membership_status": questions about the user's own club memberships, roles, or membership status.
- "unsupported_action": the user wants to CREATE, DELETE, CANCEL, UPDATE, or otherwise CHANGE something this assistant has no tool for — creating or cancelling an event, approving/rejecting a membership request, changing roles, deleting an account, editing club/event details. Task status, single assign, bulk assign, and announcement post are NOT unsupported_action (use the matching write intent even if the user may be in the wrong shell — the app will refuse by role).
- "unrelated": the question is NOT about any of the above and is NOT a request to change/create/delete anything — general knowledge, small talk, greetings, or topics this app has no data for.

Entity extraction (all optional, applies across intents where relevant):
- subject: a specific, real proper-noun event, club, or topic the question names. Do NOT extract generic self-referencing phrases like "my next event", "my club", "this event", or "current tasks" as a subject.
- timeframe: for event_lookup only — "past" or "upcoming". Omit if ambiguous.
- wantsCount: true if the question is asking "how many" of something.

Return ONLY the structured JSON output. No prose, no markdown, no explanation.`;


const GENERATE_SYSTEM_PROMPT = `You are "Ask Sangam", answering a user's question using ONLY the JSON data provided below.

Rules:
- Use only the facts present in the provided data. Never add names, dates, numbers, or details that aren't in it.
- If the data has a "totalCount" field, that is the authoritative count — always state that exact number for "how many" questions. The accompanying list (events/tasks/announcements) may be a truncated sample of just the first few, NOT the full set, so never count its length as the answer.
- If the question refers to something generically by the user's own relationship to it ("my next event", "my club", "my current tasks") rather than a specific name, and the data spans multiple different events/clubs, use any date/status fields present to resolve which one it means (e.g. "next event" = the one with the soonest date) — this is not the same as the data being unrelated to the question.
- If the data includes a "today" field, treat that as the current date and judge relative timeframe words ("this week", "today", "soon") against it. If the question asked about a specific window like "this week" and the closest item in the data actually falls outside that window (e.g. it's next Monday but "this week" ended Sunday), say so plainly and mention the next upcoming item anyway instead of refusing — e.g. "Nothing this week, but next up is X on [date]." That is a real, helpful answer, not a case for the fixed no-data sentence.
- If the data doesn't actually answer the question — including if the data is simply unrelated to what was asked — respond with exactly this sentence and nothing else: "I don't have that information." Do not soften it, explain why, or add anything else.
- Otherwise keep the answer short: one or two sentences, natural and conversational, no markdown formatting.`;

function scopedClubIds(user: AssistantSessionUser): string[] {
  return user.memberships.map((m) => m.clubId);
}

async function classify(question: string): Promise<Classification> {
  const result = await structuredCompletion({
    system: CLASSIFY_SYSTEM_PROMPT,
    prompt: question,
    schema: classificationSchema,
  });
  if (process.env.ASK_SANGAM_TRACE) {
    console.log("[TRACE assistant] === QUESTION ===\n" + question);
    console.log("[TRACE assistant] === CLASSIFIED INTENT/ENTITIES ===\n" + JSON.stringify(result, null, 2));
  }
  return result;
}

function trace(label: string, value: unknown) {
  if (!process.env.ASK_SANGAM_TRACE) return;
  console.log(`[TRACE assistant] === ${label} ===\n` + JSON.stringify(value, null, 2));
}

async function generate(question: string, data: unknown): Promise<string> {
  // `question` must always be the requester's actual original text here —
  // never a synthesized label — otherwise the model has no way to know
  // what was actually asked (e.g. a count vs. a date range vs. "who
  // organizes this") and just narrates the data generically.
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

async function handleEventLookup(
  user: AssistantSessionUser,
  question: string,
  entities: Classification["entities"],
): Promise<AssistantAnswer> {
  const clubIds = scopedClubIds(user);
  // Non-faculty users only ever see events for clubs they actually belong to
  // — a Member of one club can never pull another club's event data through
  // this endpoint. Faculty are institution-wide oversight by design (same
  // access as /faculty/approvals elsewhere in the app), so they aren't
  // club-scoped here either.
  if (!user.isFaculty && clubIds.length === 0) return NO_DATA_ANSWER;

  const wantsPast = entities.timeframe === "past";
  const scopeFilter = clubIds.length > 0 ? { clubId: { in: clubIds } } : {};
  const nameFilter = entities.subject
    ? {
        OR: [
          { title: { contains: entities.subject, mode: "insensitive" as const } },
          { club: { name: { contains: entities.subject, mode: "insensitive" as const } } },
        ],
      }
    : {};

  async function queryEvents(timeFilter: Prisma.EventWhereInput, sortDirection: "asc" | "desc") {
    const where: Prisma.EventWhereInput = { AND: [scopeFilter, timeFilter, nameFilter] };
    trace("EVENT PRISMA WHERE", where);
    const [rows, totalCount] = await Promise.all([
      prisma.event.findMany({ where, include: { club: true }, orderBy: { date: sortDirection }, take: 3 }),
      entities.wantsCount ? prisma.event.count({ where }) : Promise.resolve(null),
    ]);
    trace(
      "EVENT RAW QUERY RESULT",
      rows.map((e) => ({ id: e.id, title: e.title, date: e.date, status: e.status, clubId: e.clubId })),
    );
    if (totalCount !== null) trace("EVENT COUNT AGGREGATE", { totalCount });
    return { rows, totalCount };
  }

  let { rows: events, totalCount } = wantsPast
    ? await queryEvents({ date: { lt: new Date() } }, "desc")
    : await queryEvents({ date: { gte: new Date() } }, "asc");

  // A named subject ("Winter Debate Open") should still be found even if it
  // already happened (or hasn't started yet) — a directional search coming
  // up empty isn't proof the event doesn't exist, just that it isn't in the
  // direction assumed. Retry unbounded once before giving up, so the
  // assistant can honestly say "that already happened" instead of "no info".
  if (events.length === 0 && entities.subject) {
    ({ rows: events, totalCount } = await queryEvents({}, "desc"));
  }

  if (events.length === 0) return NO_DATA_ANSWER;

  const eventList = events.map((e) => ({
    title: e.title,
    club: e.club.name,
    date: formatEventDate(e.date),
    time: e.time,
    venue: e.venue,
    capacity: e.capacity,
    going: e.going,
    status: e.status,
  }));
  // Claude has no real-time clock — without an explicit "today" reference it
  // can't reliably judge whether a date satisfies a relative timeframe word
  // like "this week"/"today", which was causing the same question to
  // sometimes get answered and sometimes get a false "I don't have that
  // information" depending on how it happened to guess the current date.
  const data =
    totalCount !== null
      ? { today: formatEventDate(new Date()), totalCount, sampleOfTheseEvents: eventList }
      : { today: formatEventDate(new Date()), events: eventList };

  return generateAnswer(question, data, {
    sourceType: "event",
    sourceLabel: events[0].title,
    sourceHref: user.memberships.some((m) => m.role === "Coordinator" && m.clubId === events[0].clubId)
      ? `/coordinator/events/${events[0].slug}`
      : `/app/events/${events[0].slug}`,
  });
}

async function handleTaskLookup(
  user: AssistantSessionUser,
  question: string,
  entities: Classification["entities"],
): Promise<AssistantAnswer> {
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

  const taskQueryWhere: Prisma.TaskWhereInput = { assigneeId: user.id, status: { not: "done" }, ...subjectFilter };
  trace("TASK PRISMA WHERE", taskQueryWhere);

  const [tasks, totalCount] = await Promise.all([
    prisma.task.findMany({
      where: taskQueryWhere,
      include: { event: true },
      orderBy: [{ dueAt: "asc" }],
      take: 3,
    }),
    entities.wantsCount ? prisma.task.count({ where: taskQueryWhere }) : Promise.resolve(null),
  ]);

  trace(
    "TASK RAW QUERY RESULT",
    tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, dueAt: t.dueAt, eventTitle: t.event.title })),
  );
  if (totalCount !== null) trace("TASK COUNT AGGREGATE", { totalCount });

  // A named subject that matches nothing is a hard "no" — never fall back
  // to the requester's unrelated real tasks just because they have some.
  if (tasks.length === 0) return NO_DATA_ANSWER;

  const taskList = tasks.map((t) => ({
    title: t.title,
    event: t.event.title,
    // Lets the model resolve "my next event" generically when a single
    // requester's tasks span several different events — without each
    // event's own date, it can't tell which one is chronologically next.
    eventDate: formatEventDate(t.event.date),
    dueAt: formatTaskDue(t.dueAt),
    status: t.status,
    priority: t.priority,
  }));
  const data = totalCount !== null ? { totalCount, sampleOfTheseTasks: taskList } : { tasks: taskList };

  return generateAnswer(question, data, {
    sourceType: "task",
    sourceLabel: tasks[0].title,
    sourceHref: user.isFaculty ? "/faculty" : user.memberships.some((m) => m.role === "Coordinator") ? "/coordinator" : "/volunteer",
  });
}

async function handleAnnouncementLookup(
  user: AssistantSessionUser,
  question: string,
  entities: Classification["entities"],
): Promise<AssistantAnswer> {
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

  const announcementQueryWhere: Prisma.AnnouncementWhereInput = { AND: [scopeFilter, subjectFilter] };
  trace("ANNOUNCEMENT PRISMA WHERE", announcementQueryWhere);

  let announcements;
  if (!entities.subject && clubIds.length > 0) {
    // Generic "my club" questions: a global pinned-then-recent sort can let
    // other clubs' pinned institution-wide notices crowd the requester's own
    // (possibly unpinned) club announcements out of the capped sample
    // entirely, making the assistant wrongly claim it has no info about
    // their own club. Fetch the requester's own club first, then top up with
    // institution-wide ones only if there's room left.
    const ownAnnouncements = await prisma.announcement.findMany({
      where: { AND: [{ clubId: { in: clubIds } }, subjectFilter] },
      include: { club: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 3,
    });
    const institutionWide =
      ownAnnouncements.length < 3
        ? await prisma.announcement.findMany({
            where: { AND: [{ audience: "All" }, subjectFilter] },
            include: { club: true },
            orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
            take: 3 - ownAnnouncements.length,
          })
        : [];
    announcements = [...ownAnnouncements, ...institutionWide];
  } else {
    announcements = await prisma.announcement.findMany({
      where: announcementQueryWhere,
      include: { club: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 3,
    });
  }
  const totalCount = entities.wantsCount ? await prisma.announcement.count({ where: announcementQueryWhere }) : null;

  trace(
    "ANNOUNCEMENT RAW QUERY RESULT",
    announcements.map((a) => ({ id: a.id, title: a.title, clubId: a.clubId, pinned: a.pinned, createdAt: a.createdAt })),
  );
  if (totalCount !== null) trace("ANNOUNCEMENT COUNT AGGREGATE", { totalCount });

  // A named topic that matches nothing is a hard "no" — never fall back to
  // generic latest announcements just because some exist.
  if (announcements.length === 0) return NO_DATA_ANSWER;

  const adminClubIds = new Set(
    user.memberships.filter((m) => m.role === "Admin").map((m) => m.clubId),
  );
  announcements = announcements.filter((a) => {
    if (!a.recipientUserIds || a.recipientUserIds.length === 0) return true;
    return (
      a.recipientUserIds.includes(user.id) ||
      a.authorId === user.id ||
      adminClubIds.has(a.clubId)
    );
  });
  if (announcements.length === 0) return NO_DATA_ANSWER;

  // "audience: All" announcements are intentionally interleaved from clubs
  // the requester isn't in (institution-wide notices) — without an explicit
  // flag, the generation model has no way to tell that apart from a scoping
  // bug and was misreading "my club" questions as unanswered when the data
  // legitimately mixed in another club's institution-wide announcement.
  const announcementList = announcements.map((a) => ({
    title: a.title,
    club: a.club.name,
    scope: clubIds.includes(a.clubId) ? "your club" : "institution-wide, visible to every club",
    body: a.body,
    pinned: a.pinned,
  }));
  const data = totalCount !== null ? { totalCount, sampleOfTheseAnnouncements: announcementList } : { announcements: announcementList };

  return generateAnswer(question, data, {
    sourceType: "announcement",
    sourceLabel: announcements[0].title,
    sourceHref: user.isFaculty ? "/faculty" : "/app",
  });
}

async function handleMembershipStatus(
  user: AssistantSessionUser,
  question: string,
  entities: Classification["entities"],
): Promise<AssistantAnswer> {
  // Always scoped to the requester's own userId — never another user's memberships.
  const membershipQueryWhere: Prisma.MembershipWhereInput = { userId: user.id };
  trace("MEMBERSHIP PRISMA WHERE", membershipQueryWhere);

  const allMemberships = await prisma.membership.findMany({
    where: membershipQueryWhere,
    include: { club: true },
  });

  trace(
    "MEMBERSHIP RAW QUERY RESULT",
    allMemberships.map((m) => ({ id: m.id, club: m.club.name, role: m.role, status: m.status })),
  );

  // A specific club named that the user isn't actually in is a hard "no" —
  // never fall back to listing their real, unrelated memberships instead.
  const memberships = entities.subject
    ? allMemberships.filter((m) => m.club.name.toLowerCase().includes(entities.subject!.toLowerCase()))
    : allMemberships;

  trace("MEMBERSHIP AFTER SUBJECT FILTER", memberships.map((m) => m.club.name));

  if (memberships.length === 0 && !(user.isFaculty && !entities.subject)) return NO_DATA_ANSWER;

  const data = user.isFaculty
    ? { isFaculty: true, memberships: memberships.map((m) => ({ club: m.club.name, role: m.role, status: m.status })) }
    : { memberships: memberships.map((m) => ({ club: m.club.name, role: m.role, status: m.status })) };

  return generateAnswer(question, data, {
    sourceType: "membership",
    sourceLabel: memberships[0]?.club.name,
    sourceHref: "/app/profile",
  });
}

export async function answerAssistantQuery(
  user: AssistantSessionUser,
  question: string,
  options?: { activeRole?: AppRole },
): Promise<AssistantAnswer> {
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
        return await handleEventLookup(user, question, classification.entities);
      case "task_lookup":
        return await handleTaskLookup(user, question, classification.entities);
      case "task_action": {
        const role = options?.activeRole;
        if (role && role !== "volunteer" && role !== "coordinator") {
          return TASK_STATUS_WRONG_SHELL;
        }
        return await runWriteToolAgent(user, question, options?.activeRole);
      }
      case "task_assign": {
        if (options?.activeRole && options.activeRole !== "coordinator") {
          return TASK_ASSIGN_WRONG_SHELL;
        }
        return await runWriteToolAgent(user, question, options?.activeRole);
      }
      case "bulk_task_assign": {
        if (options?.activeRole && options.activeRole !== "coordinator") {
          return BULK_WRITE_WRONG_SHELL;
        }
        return await runWriteToolAgent(user, question, options?.activeRole);
      }
      case "announcement_action": {
        if (options?.activeRole && options.activeRole !== "admin") {
          return ANNOUNCE_WRITE_WRONG_SHELL;
        }
        return await runWriteToolAgent(user, question, options?.activeRole);
      }
      case "announcement_lookup":
        return await handleAnnouncementLookup(user, question, classification.entities);
      case "membership_status":
        return await handleMembershipStatus(user, question, classification.entities);
      case "unsupported_action":
        return UNSUPPORTED_ACTION_ANSWER;
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
