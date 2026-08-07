/**
 * Integration tests for GET /api/auth/me (User Story 1.1, multi-role).
 *
 * Requires a running Sangam app + database:
 *   npm run db:up && npm run db:push && npm run db:seed && npm run dev
 *   npm run test:integration
 */
import { deleteUsersByEmails } from "./db-cleanup";
import { ApiClient, isApiAvailable, requireApiAvailable, reportCase, signup, login, uniqueIdentity, ME_PATH } from "./helpers";

const USER_STORY = "1.1";
const createdEmails: string[] = [];
let client: ApiClient;

beforeAll(async () => {
  requireApiAvailable(await isApiAvailable());
});

beforeEach(() => {
  client = new ApiClient();
});

afterAll(async () => {
  if (createdEmails.length > 0) {
    const deleted = await deleteUsersByEmails(createdEmails);
    console.log(`\n[cleanup] deleted ${deleted} test user(s): ${createdEmails.join(", ")}`);
  }
});

it("rejects an unauthenticated request", async () => {
  const res = await client.get(ME_PATH);
  const expected = { status: 401, "error.code": "UNAUTHENTICATED", userStory: USER_STORY };

  reportCase("GET /api/auth/me - unauthenticated", "no session cookie", expected, res, () => {
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(res.body.userStory).toBe(USER_STORY);
  });
});

it("never returns a privileged session when no cookie is sent", async () => {
  const res = await client.get(ME_PATH);
  const expected = { status: 401, notDemoId: "u1", notDemoEmail: "23s1000123@ds.study.iitm.ac.in" };

  reportCase("GET /api/auth/me - anonymous has no session", "no session cookie", expected, res, () => {
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.data?.id).not.toBe("u1");
    expect(JSON.stringify(res.body.data ?? {})).not.toContain("23s1000123@ds.study.iitm.ac.in");
  });
});

it("rejects a forged or tampered session cookie", async () => {
  const forged = new ApiClient();
  forged.setCookie("sangam_session", "u1.0000000000000000000000000000000000000000000000000000000000000000");
  const res = await forged.get(ME_PATH);
  const expected = { status: 401 };

  reportCase("GET /api/auth/me - forged session cookie", "sangam_session=u1.<bad signature>", expected, res, () => {
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

it("works with the session set by signup", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signup(client, identity);

  const res = await client.get(ME_PATH);
  const expected = { status: 200, "data.email": identity.email, "data.home": "/app", userStory: USER_STORY };

  reportCase("GET /api/auth/me - after signup cookies", identity.email, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(identity.email);
    expect(res.body.data.name).toBe(identity.name);
    expect(res.body.data.rollNumber).toBe(identity.rollNumber);
    expect(res.body.data.isFaculty).toBe(false);
    expect(Array.isArray(res.body.data.memberships)).toBe(true);
    expect(Array.isArray(res.body.data.roles)).toBe(true);
    expect(res.body.data.home).toBe("/app");
    expect(res.body.userStory).toBe(USER_STORY);
  });
});

it("returns the current user after a real login", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signup(client, identity);
  client.clearCookies();
  await login(client, identity.email, identity.password);

  const res = await client.get(ME_PATH);
  const expected = { status: 200, success: true, "data.email": identity.email, roles: "list", memberships: "list", userStory: USER_STORY };

  reportCase("GET /api/auth/me - after login", identity.email, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data.email).toBe(identity.email);
    expect(res.body.data.name).toBe(identity.name);
    expect(Array.isArray(res.body.data.memberships)).toBe(true);
    expect(Array.isArray(res.body.data.roles)).toBe(true);
    expect(["/app", "/admin", "/coordinator", "/volunteer", "/faculty"]).toContain(res.body.data.home);
    expect(res.body.userStory).toBe(USER_STORY);
  });
});

it("keeps the mock auth stub separate from /me", async () => {
  const res = await client.get("/api/auth/session");
  const expected = { status: 200, mode: "mock" };

  reportCase("GET /api/auth/[...nextauth] - mock stub separate from /me", "GET /api/auth/session", expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("mock");
  });
});
