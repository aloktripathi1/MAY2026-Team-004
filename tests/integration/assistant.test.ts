/**
 * Integration tests for POST /api/assistant/query — the Ask Sangam panel's
 * real three-step Claude flow (classify -> scoped Prisma query -> generate).
 * Requires ANTHROPIC_API_KEY to be set; these hit the real Claude API.
 */
import { prisma } from "@/backend/db/prisma";
import { ApiClient, isApiAvailable, requireApiAvailable, login, SEEDED_ACCOUNTS, CLUB_IDS } from "./helpers";

const QUERY_PATH = "/api/assistant/query";

// Each case here makes two real, sequential Claude API round-trips
// (classify, then generate) through the live endpoint — comfortably over
// the suite's default 20s per-test timeout on a slow response.
jest.setTimeout(45_000);

beforeAll(async () => {
  requireApiAvailable(await isApiAvailable());
});

it("requires authentication", async () => {
  const client = new ApiClient();
  const res = await client.request("POST", QUERY_PATH, { json: { query: "When's my next event?" } });
  expect(res.status).toBe(401);
  expect(res.body.success).toBe(false);
});

it("rejects an empty query", async () => {
  const client = new ApiClient();
  await login(client, SEEDED_ACCOUNTS.member.email, SEEDED_ACCOUNTS.member.password);
  const res = await client.request("POST", QUERY_PATH, { json: { query: "   " } });
  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
});

it("answers a membership_status question grounded in the member's real memberships", async () => {
  const client = new ApiClient();
  await login(client, SEEDED_ACCOUNTS.member.email, SEEDED_ACCOUNTS.member.password);
  const res = await client.request("POST", QUERY_PATH, { json: { query: "Which clubs am I a member of, and what's my role?" } });
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.sourceType).toBe("membership");
  expect(res.body.data.answer.toLowerCase()).toContain("paradox");
});

it("answers a task_lookup question grounded in the coordinator's real assigned tasks", async () => {
  const coordinator = await prisma.user.findUnique({ where: { email: SEEDED_ACCOUNTS.coordinator.email } });
  const openTask = await prisma.task.findFirst({ where: { assigneeId: coordinator!.id, status: { not: "done" } } });
  if (!openTask) return; // seed data has no open task for this account right now

  const client = new ApiClient();
  await login(client, SEEDED_ACCOUNTS.coordinator.email, SEEDED_ACCOUNTS.coordinator.password);

  const res = await client.request("POST", QUERY_PATH, { json: { query: "What's on my task list right now?" } });
  expect(res.status).toBe(200);
  expect(res.body.data.sourceType).toBe("task");
  expect(res.body.data.answer.length).toBeGreaterThan(0);
});

it("answers an event_lookup question grounded in the member's own club's next event", async () => {
  const client = new ApiClient();
  await login(client, SEEDED_ACCOUNTS.member.email, SEEDED_ACCOUNTS.member.password);
  const nextEvent = await prisma.event.findFirst({
    where: { clubId: CLUB_IDS.paradox, date: { gte: new Date() } },
    orderBy: { date: "asc" },
  });
  if (!nextEvent) return; // seed data has no future Paradox event right now — nothing to assert

  const res = await client.request("POST", QUERY_PATH, { json: { query: "When's my next event?" } });
  expect(res.status).toBe(200);
  expect(res.body.data.sourceType).toBe("event");
  expect(res.body.data.answer.toLowerCase()).toContain(nextEvent!.title.toLowerCase());
});

it("never leaks another club's event data to a member who isn't in that club", async () => {
  const client = new ApiClient();
  await login(client, SEEDED_ACCOUNTS.member.email, SEEDED_ACCOUNTS.member.password); // Paradox (c2) only
  const codechefEvent = await prisma.event.findFirst({ where: { clubId: CLUB_IDS.codechef } });
  if (!codechefEvent) return; // no CodeChef event in seed data — nothing to assert

  const res = await client.request("POST", QUERY_PATH, { json: { query: `Tell me about the "${codechefEvent!.title}" event.` } });
  expect(res.status).toBe(200);
  // Scoped query returns nothing for a club this member doesn't belong to —
  // must hit the fixed no-data response, never a Claude-improvised answer
  // and never the real CodeChef event details.
  expect(res.body.data.sourceType).toBeNull();
  expect(res.body.data.answer).toBe("I don't have that information.");
  expect(res.body.data.answer.toLowerCase()).not.toContain(codechefEvent!.title.toLowerCase());
});

it("returns the fixed no-data response instead of a hallucinated answer when nothing matches", async () => {
  const client = new ApiClient();
  await login(client, SEEDED_ACCOUNTS.member.email, SEEDED_ACCOUNTS.member.password);
  // Plain members aren't assigned Tasks in the seed data, so this intent
  // resolves but the scoped query legitimately returns zero rows.
  const res = await client.request("POST", QUERY_PATH, { json: { query: "What tasks have been assigned to me?" } });
  expect(res.status).toBe(200);
  expect(res.body.data.sourceType).toBeNull();
  expect(res.body.data.answer).toBe("I don't have that information.");
});

it("scopes an admin's announcement question to their own club's announcements", async () => {
  const client = new ApiClient();
  await login(client, SEEDED_ACCOUNTS.admin.email, SEEDED_ACCOUNTS.admin.password);
  const res = await client.request("POST", QUERY_PATH, { json: { query: "What's the latest announcement for my club?" } });
  expect(res.status).toBe(200);
  expect(res.body.data.sourceType).toBe("announcement");
});
