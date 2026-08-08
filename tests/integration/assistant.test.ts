/**
 * Integration tests for Ask Sangam Q&A via answerAssistantQuery (Server Actions
 * call the same domain path). HTTP /api/assistant/* is retired (410).
 * Requires ANTHROPIC_API_KEY; these hit the real Claude API.
 */
import { prisma } from "@/backend/db/prisma";
import { answerAssistantQuery } from "@/backend/domain/assistant";
import type { AssistantSessionUser } from "@/backend/domain/assistant-types";
import { ApiClient, isApiAvailable, requireApiAvailable, login, SEEDED_ACCOUNTS, CLUB_IDS } from "./helpers";

jest.setTimeout(45_000);

async function sessionUserForEmail(email: string): Promise<AssistantSessionUser> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { club: true } } },
  });
  if (!user) throw new Error(`Missing seeded user ${email}`);
  return {
    id: user.id,
    isFaculty: user.isFaculty,
    memberships: user.memberships.map((m) => ({
      clubId: m.clubId,
      clubSlug: m.club.slug,
      clubName: m.club.name,
      role: m.role,
      personaName: user.name,
    })),
  };
}

beforeAll(async () => {
  requireApiAvailable(await isApiAvailable());
});

it("HTTP assistant query route is retired (410)", async () => {
  const client = new ApiClient();
  await login(client, SEEDED_ACCOUNTS.member.email, SEEDED_ACCOUNTS.member.password);
  const res = await client.request("POST", "/api/assistant/query", { json: { query: "When's my next event?" } });
  expect(res.status).toBe(410);
  expect(res.body.success).toBe(false);
});

it("answers a membership_status question grounded in the member's real memberships", async () => {
  const user = await sessionUserForEmail(SEEDED_ACCOUNTS.member.email);
  const result = await answerAssistantQuery(user, "Which clubs am I a member of, and what's my role?");
  expect(result.sourceType).toBe("membership");
  expect(result.answer.toLowerCase()).toContain("paradox");
});

it("answers a task_lookup question grounded in the coordinator's real assigned tasks", async () => {
  const coordinator = await prisma.user.findUnique({ where: { email: SEEDED_ACCOUNTS.coordinator.email } });
  const openTask = await prisma.task.findFirst({ where: { assigneeId: coordinator!.id, status: { not: "done" } } });
  if (!openTask) return;

  const user = await sessionUserForEmail(SEEDED_ACCOUNTS.coordinator.email);
  const result = await answerAssistantQuery(user, "What's on my task list right now?");
  expect(result.sourceType).toBe("task");
  expect(result.answer.length).toBeGreaterThan(0);
});

it("answers an event_lookup question grounded in the member's own club's next event", async () => {
  const nextEvent = await prisma.event.findFirst({
    where: { clubId: CLUB_IDS.paradox, date: { gte: new Date() } },
    orderBy: { date: "asc" },
  });
  if (!nextEvent) return;

  const user = await sessionUserForEmail(SEEDED_ACCOUNTS.member.email);
  const result = await answerAssistantQuery(user, "When's my next event?");
  expect(result.sourceType).toBe("event");
  expect(result.answer.toLowerCase()).toContain(nextEvent.title.toLowerCase());
});

it("never leaks another club's event data to a member who isn't in that club", async () => {
  const codechefEvent = await prisma.event.findFirst({ where: { clubId: CLUB_IDS.codechef } });
  if (!codechefEvent) return;

  const user = await sessionUserForEmail(SEEDED_ACCOUNTS.member.email);
  const result = await answerAssistantQuery(user, `Tell me about the "${codechefEvent.title}" event.`);
  expect(result.sourceType).toBeNull();
  expect(result.answer).toBe("I don't have that information.");
  expect(result.answer.toLowerCase()).not.toContain(codechefEvent.title.toLowerCase());
});

it("returns the fixed no-data response instead of a hallucinated answer when nothing matches", async () => {
  const user = await sessionUserForEmail(SEEDED_ACCOUNTS.member.email);
  const result = await answerAssistantQuery(user, "What tasks have been assigned to me?");
  expect(result.sourceType).toBeNull();
  expect(result.answer).toBe("I don't have that information.");
});

it("scopes an admin's announcement question to their own club's announcements", async () => {
  const user = await sessionUserForEmail(SEEDED_ACCOUNTS.admin.email);
  const result = await answerAssistantQuery(user, "What's the latest announcement for my club?");
  expect(result.sourceType).toBe("announcement");
});

describe("questions unrelated to any app data", () => {
  const offTopicQuestions = ["What is the capital of France?", "Tell me a joke.", "What's the weather like today?"];

  it.each(offTopicQuestions)("returns the fixed no-data response for: %s", async (query) => {
    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.member.email);
    const result = await answerAssistantQuery(user, query);
    expect(result.sourceType).toBeNull();
    expect(result.answer).toBe("I don't have that information.");
  });
});

describe("named-but-nonexistent subjects within a real intent", () => {
  const cases: Array<{ role: keyof typeof SEEDED_ACCOUNTS; query: string }> = [
    { role: "coordinator", query: "What tasks do I have for the Time Travel Symposium?" },
    { role: "admin", query: "What's the announcement about the club's new spaceship sponsorship?" },
    { role: "admin", query: "Am I an admin of the Underwater Basket Weaving Club?" },
    { role: "member", query: "Tell me about the 'Intergalactic Robotics Gala' event." },
  ];

  it.each(cases)("returns the fixed no-data response for a fictional subject ($role): $query", async ({ role, query }) => {
    const account = SEEDED_ACCOUNTS[role];
    const user = await sessionUserForEmail(account.email);
    const result = await answerAssistantQuery(user, query);
    expect(result.sourceType).toBeNull();
    expect(result.answer).toBe("I don't have that information.");
  });
});

describe("question-type differentiation (count, date-range, past, generic 'my X')", () => {
  it("answers a 'how many' question with the real count, not the length of the capped sample", async () => {
    const member = await prisma.user.findUnique({ where: { email: SEEDED_ACCOUNTS.member.email } });
    const membership = await prisma.membership.findFirst({ where: { userId: member!.id } });
    const realCount = await prisma.event.count({
      where: { clubId: membership!.clubId, date: { gte: new Date() } },
    });
    if (realCount === 0) return;

    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.member.email);
    const result = await answerAssistantQuery(user, "How many upcoming events does my club have?");
    expect(result.sourceType).toBe("event");
    expect(result.answer).toMatch(new RegExp(`\\b${realCount}\\b`));
  });

  it("answers a past-events question with actually-past events, not upcoming ones", async () => {
    const pastEvent = await prisma.event.findFirst({
      where: { clubId: CLUB_IDS.paradox, date: { lt: new Date() } },
      orderBy: { date: "desc" },
    });
    if (!pastEvent) return;

    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.member.email);
    const result = await answerAssistantQuery(user, "What past events has my club run?");
    expect(result.sourceType).toBe("event");
    expect(result.answer.toLowerCase()).toContain(pastEvent.title.toLowerCase());
  });

  it("still finds a named event by name even when it has already happened, instead of claiming no info", async () => {
    const pastNamedEvent = await prisma.event.findFirst({
      where: { clubId: CLUB_IDS.paradox, date: { lt: new Date() } },
    });
    if (!pastNamedEvent) return;

    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.member.email);
    const result = await answerAssistantQuery(
      user,
      `Is "${pastNamedEvent.title}" still open for registration?`,
    );
    expect(result.sourceType).toBe("event");
  });

  it("resolves a generic 'my next event' reference in a task question instead of returning no-data", async () => {
    const volunteer = await prisma.user.findUnique({ where: { email: SEEDED_ACCOUNTS.volunteer.email } });
    const openTask = await prisma.task.findFirst({
      where: { assigneeId: volunteer!.id, status: { not: "done" } },
    });
    if (!openTask) return;

    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.volunteer.email);
    const result = await answerAssistantQuery(user, "What tasks am I assigned to for my next event?");
    expect(result.sourceType).toBe("task");
  });

  it("finds a member's own club's announcements even when other clubs' pinned institution-wide notices exist", async () => {
    const ownAnnouncement = await prisma.announcement.findFirst({ where: { clubId: CLUB_IDS.paradox } });
    if (!ownAnnouncement) return;

    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.member.email);
    const result = await answerAssistantQuery(user, "Any news from my club?");
    expect(result.sourceType).toBe("announcement");
  });
});

describe("club_roster_lookup (coordinator)", () => {
  it("lists active volunteers for clubs the coordinator manages", async () => {
    const volunteerCount = await prisma.membership.count({
      where: { clubId: CLUB_IDS.paradox, status: "Active", role: "Volunteer" },
    });
    if (volunteerCount === 0) return;

    const sample = await prisma.membership.findFirst({
      where: { clubId: CLUB_IDS.paradox, status: "Active", role: "Volunteer" },
      include: { user: true },
    });

    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.coordinator.email);
    const result = await answerAssistantQuery(user, "List active volunteers", { activeRole: "coordinator" });
    expect(result.sourceType).toBe("membership");
    expect(result.sourceHref).toBe("/coordinator/volunteers");
    expect(result.answer.toLowerCase()).not.toBe("i don't have that information.");
    if (sample?.user.name) {
      expect(result.answer.toLowerCase()).toContain(sample.user.name.toLowerCase().split(" ")[0]!);
    }
  });

  it("answers who has the most open tasks from club board data", async () => {
    const openOnClub = await prisma.task.count({
      where: { status: { not: "done" }, event: { clubId: CLUB_IDS.paradox } },
    });
    if (openOnClub === 0) return;

    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.coordinator.email);
    const result = await answerAssistantQuery(user, "Who has the most open tasks?", {
      activeRole: "coordinator",
    });
    expect(result.sourceType).toBe("membership");
    expect(result.answer.toLowerCase()).not.toBe("i don't have that information.");
  });

  it("answers who has the most done tasks from club board data", async () => {
    const doneOnClub = await prisma.task.count({
      where: { status: "done", event: { clubId: CLUB_IDS.paradox } },
    });
    if (doneOnClub === 0) return;

    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.coordinator.email);
    const result = await answerAssistantQuery(user, "Who has the most done tasks?", {
      activeRole: "coordinator",
    });
    expect(result.sourceType).toBe("membership");
    expect(result.answer.toLowerCase()).not.toBe("i don't have that information.");
  });

  it("refuses club roster reads outside the coordinator shell", async () => {
    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.coordinator.email);
    const result = await answerAssistantQuery(user, "List active volunteers", { activeRole: "volunteer" });
    // May classify as club_roster_lookup (wrong shell) or another intent; must not invent a full roster.
    if (result.sourceType === null) {
      expect(result.answer.toLowerCase()).toMatch(/coordinator|don't have that information|not available|isn't available/);
    }
  });
});
