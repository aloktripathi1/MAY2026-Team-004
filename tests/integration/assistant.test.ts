/**
 * Integration tests for POST /api/assistant/query — the Ask Sangam panel.
 * One shared endpoint, role-aware answers via the authenticated session.
 */
import { ApiClient, isApiAvailable, requireApiAvailable, login, SEEDED_ACCOUNTS } from "./helpers";

const QUERY_PATH = "/api/assistant/query";

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

it("answers a member's question about their memberships with a membership source", async () => {
  const client = new ApiClient();
  await login(client, SEEDED_ACCOUNTS.member.email, SEEDED_ACCOUNTS.member.password);
  const res = await client.request("POST", QUERY_PATH, { json: { query: "Which clubs am I a member of?" } });
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.sourceType).toBe("membership");
  expect(typeof res.body.data.answer).toBe("string");
  expect(res.body.data.answer.length).toBeGreaterThan(0);
});

it("answers a coordinator's task question with a task source", async () => {
  const client = new ApiClient();
  await login(client, SEEDED_ACCOUNTS.coordinator.email, SEEDED_ACCOUNTS.coordinator.password);
  const res = await client.request("POST", QUERY_PATH, { json: { query: "What tasks do I have?" } });
  expect(res.status).toBe(200);
  expect(res.body.data.sourceType).toBe("task");
});

it("scopes an admin's pending-approvals question to their own club(s)", async () => {
  const client = new ApiClient();
  await login(client, SEEDED_ACCOUNTS.admin.email, SEEDED_ACCOUNTS.admin.password);
  const res = await client.request("POST", QUERY_PATH, { json: { query: "How many pending approvals do I have?" } });
  expect(res.status).toBe(200);
  expect(res.body.data.sourceType).toBe("membership");
  expect(res.body.data.answer).toMatch(/pending membership/i);
});

it("answers a faculty member's approvals question institution-wide, not membership-scoped", async () => {
  const client = new ApiClient();
  await login(client, SEEDED_ACCOUNTS.faculty.email, SEEDED_ACCOUNTS.faculty.password);
  const res = await client.request("POST", QUERY_PATH, { json: { query: "How many pending approvals do I have?" } });
  expect(res.status).toBe(200);
  expect(res.body.data.sourceType).toBe("event");
});

it("falls back gracefully for an unrecognized question", async () => {
  const client = new ApiClient();
  await login(client, SEEDED_ACCOUNTS.member.email, SEEDED_ACCOUNTS.member.password);
  const res = await client.request("POST", QUERY_PATH, { json: { query: "asdkjhaskjdh nonsense query" } });
  expect(res.status).toBe(200);
  expect(res.body.data.sourceType).toBeNull();
});
