/**
 * Integration tests for POST /api/auth/login (User Story 1.1).
 *
 * Requires a running Sangam app + database:
 *   npm run db:up && npm run db:push && npm run db:seed && npm run dev
 *   npm run test:integration
 */
import { deleteUsersByEmails } from "./db-cleanup";
import { ApiClient, isApiAvailable, requireApiAvailable, reportCase, signup, uniqueIdentity, LOGIN_PATH } from "./helpers";

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

it("rejects a non-institutional email", async () => {
  const payload = { email: "student@gmail.com", password: "sangam" };
  const res = await client.post(LOGIN_PATH, payload);
  const expected = { status: 400, "error.code": "VALIDATION_ERROR", userStory: USER_STORY };

  reportCase("POST /api/auth/login - non-institutional email", payload, expected, res, () => {
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toContain("@ds.study.iitm.ac.in");
    expect(res.body.userStory).toBe(USER_STORY);
  });
});

it("rejects an empty password", async () => {
  const payload = { email: "23s1000123@ds.study.iitm.ac.in", password: "" };
  const res = await client.post(LOGIN_PATH, payload);
  const expected = { status: 400, "error.code": "VALIDATION_ERROR" };

  reportCase("POST /api/auth/login - empty password", payload, expected, res, () => {
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

it("rejects an invalid JSON body", async () => {
  const res = await client.postRaw(LOGIN_PATH, "{not-json");
  const expected = { status: 400, "error.code": "INVALID_JSON", userStory: USER_STORY };

  reportCase("POST /api/auth/login - invalid JSON body", "{not-json", expected, res, () => {
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
    expect(res.body.userStory).toBe(USER_STORY);
  });
});

it("rejects an unknown email", async () => {
  const payload = { email: "23tmissing999@ds.study.iitm.ac.in", password: "SecurePass1" };
  const res = await client.post(LOGIN_PATH, payload);
  const expected = { status: 401, "error.code": "INVALID_CREDENTIALS", message: "Invalid email or password.", userStory: USER_STORY };

  reportCase("POST /api/auth/login - unknown email (no enumeration)", payload, expected, res, () => {
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(res.body.error.message).toBe("Invalid email or password.");
    expect(res.body.userStory).toBe(USER_STORY);
  });
});

it("rejects the wrong password", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signup(client, identity);

  const payload = { email: identity.email, password: "WrongPass999" };
  const res = await client.post(LOGIN_PATH, payload);
  const expected = { status: 401, "error.code": "INVALID_CREDENTIALS", message: "Invalid email or password." };

  reportCase("POST /api/auth/login - wrong password", { ...payload, password: "***" }, expected, res, () => {
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(res.body.error.message).toBe("Invalid email or password.");
  });
});

it("succeeds with valid credentials", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signup(client, identity);
  client.clearCookies();

  const payload = { email: identity.email, password: identity.password };
  const res = await client.post(LOGIN_PATH, payload);
  const expected = {
    status: 200,
    success: true,
    "data.email": payload.email,
    "data.next": "/app",
    userStory: USER_STORY,
    cookie: "sangam_session",
  };

  reportCase("POST /api/auth/login - valid institutional credentials", { ...payload, password: "***" }, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(payload.email);
    expect(res.body.data.name).toBe(identity.name);
    expect(res.body.data.rollNumber).toBe(identity.rollNumber);
    expect(res.body.data.isFaculty).toBe(false);
    expect(Array.isArray(res.body.data.memberships)).toBe(true);
    // Fresh signup, 0 memberships, not faculty -> role-aware home is /app (#77).
    expect(res.body.data.next).toBe("/app");
    expect(res.body.userStory).toBe(USER_STORY);
    expect(client.getCookie("sangam_session")).toBeTruthy();
  });
});

it("honors a safe callbackUrl", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signup(client, identity);
  client.clearCookies();

  const payload = { email: identity.email, password: identity.password, callbackUrl: "/app/profile" };
  const res = await client.post(LOGIN_PATH, payload);
  const expected = { status: 200, "data.next": "/app/profile" };

  reportCase("POST /api/auth/login - safe callbackUrl", { ...payload, password: "***" }, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.data.next).toBe("/app/profile");
  });
});

it("ignores an unsafe callbackUrl", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signup(client, identity);
  client.clearCookies();

  const payload = { email: identity.email, password: identity.password, callbackUrl: "https://evil.com" };
  const res = await client.post(LOGIN_PATH, payload);
  const expected = { status: 200, "data.next": "/app" };

  reportCase("POST /api/auth/login - unsafe callbackUrl ignored", { ...payload, password: "***" }, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.data.next).toBe("/app");
    expect(res.body.data.next).not.toContain("evil.com");
  });
});

it("gives an unknown email and a wrong password the identical response", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signup(client, identity);
  client.clearCookies();

  const unknown = await client.post(LOGIN_PATH, { email: "23tnope0001@ds.study.iitm.ac.in", password: "SecurePass1" });
  const wrong = await client.post(LOGIN_PATH, { email: identity.email, password: "WrongPass999" });
  const expected = { bothStatus: 401, bothCode: "INVALID_CREDENTIALS", sameMessage: true };
  const actual = { unknown: { status: unknown.status, body: unknown.body }, wrong: { status: wrong.status, body: wrong.body } };

  reportCase(
    "POST /api/auth/login - unknown vs wrong password identical response",
    "unknown email + wrong password for an existing user",
    expected,
    actual,
    () => {
      expect(unknown.status).toBe(401);
      expect(wrong.status).toBe(401);
      expect(unknown.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(unknown.body.error.message).toBe(wrong.body.error.message);
    },
  );
});
