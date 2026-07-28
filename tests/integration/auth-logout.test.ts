/**
 * Integration tests for POST /api/auth/logout.
 *
 * Requires a running Sangam app + database:
 *   npm run db:up && npm run db:push && npm run db:seed && npm run dev
 *   npm run test:integration
 */
import { deleteUsersByEmails } from "./db-cleanup";
import { ApiClient, isApiAvailable, requireApiAvailable, reportCase, signup, uniqueIdentity, LOGOUT_PATH, ME_PATH } from "./helpers";

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

it("clears the session cookie and returns 200 even when nobody was signed in", async () => {
  const res = await client.post(LOGOUT_PATH);
  const expected = { status: 200, "data.loggedOut": true };

  reportCase("POST /api/auth/logout - no prior session", {}, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.loggedOut).toBe(true);
  });
});

it("actually invalidates a real session, not just the redirect", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signup(client, identity);

  const beforeLogout = await client.get(ME_PATH);
  expect(beforeLogout.status).toBe(200);

  const logoutRes = await client.post(LOGOUT_PATH);
  const afterLogout = await client.get(ME_PATH);

  const expected = { logoutStatus: 200, meAfterLogoutStatus: 401 };
  const actual = { logoutStatus: logoutRes.status, meAfterLogoutStatus: afterLogout.status, meAfterLogoutBody: afterLogout.body };

  reportCase("POST /api/auth/logout - session is unusable afterward", identity.email, expected, actual, () => {
    expect(logoutRes.status).toBe(200);
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body.error.code).toBe("UNAUTHENTICATED");
  });
});
