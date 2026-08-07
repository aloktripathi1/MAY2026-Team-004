/**
 * Integration tests for POST /api/auth/signup (User Story 1.1).
 *
 * Requires a running Sangam app + database:
 *   npm run db:up && npm run db:push && npm run db:seed && npm run dev
 *   npm run test:integration
 */
import { deleteUsersByEmails } from "./db-cleanup";
import { ApiClient, isApiAvailable, requireApiAvailable, reportCase, uniqueIdentity, SIGNUP_PATH } from "./helpers";

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
  const payload = { name: "Outside User", email: "student@gmail.com", rollNumber: "23s1000888", password: "SecurePass1" };
  const res = await client.post(SIGNUP_PATH, payload);
  const expected = { status: 400, success: false, "error.code": "VALIDATION_ERROR", userStory: USER_STORY };

  reportCase("POST /api/auth/signup - non-institutional email", payload, expected, res, () => {
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toContain("@ds.study.iitm.ac.in");
    expect(res.body.userStory).toBe(USER_STORY);
  });
});

it("rejects an email where the institutional domain is only a substring", async () => {
  const payload = { name: "Spoof User", email: "evil@ds.study.iitm.ac.in.evil.com", rollNumber: "23s1000777", password: "SecurePass1" };
  const res = await client.post(SIGNUP_PATH, payload);
  const expected = { status: 400, "error.code": "VALIDATION_ERROR" };

  reportCase("POST /api/auth/signup - spoofed domain substring", payload, expected, res, () => {
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

it("rejects a short password", async () => {
  const payload = { name: "Ananya Rao", email: "23s1000999@ds.study.iitm.ac.in", rollNumber: "23s1000999", password: "short" };
  const res = await client.post(SIGNUP_PATH, payload);
  const expected = { status: 400, "error.code": "VALIDATION_ERROR", message: "at least 8" };

  reportCase("POST /api/auth/signup - password too short", payload, expected, res, () => {
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toContain("at least 8");
  });
});

it("rejects a blank name", async () => {
  const payload = { name: "  ", email: "23s1000999@ds.study.iitm.ac.in", rollNumber: "23s1000999", password: "SecurePass1" };
  const res = await client.post(SIGNUP_PATH, payload);
  const expected = { status: 400, "error.code": "VALIDATION_ERROR" };

  reportCase("POST /api/auth/signup - blank name", payload, expected, res, () => {
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

it("rejects an invalid JSON body", async () => {
  const res = await client.postRaw(SIGNUP_PATH, "{not-json");
  const expected = { status: 400, "error.code": "INVALID_JSON", userStory: USER_STORY };

  reportCase("POST /api/auth/signup - invalid JSON body", "{not-json", expected, res, () => {
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_JSON");
    expect(res.body.userStory).toBe(USER_STORY);
  });
});

it("creates an account with a valid institutional email", async () => {
  const payload = uniqueIdentity();
  createdEmails.push(payload.email);
  const res = await client.post(SIGNUP_PATH, payload);
  const expected = {
    status: 201,
    success: true,
    "data.email": payload.email,
    "data.rollNumber": payload.rollNumber,
    "data.next": "/signup/onboarding",
    userStory: USER_STORY,
    cookie: "sangam_session",
  };

  reportCase("POST /api/auth/signup - valid institutional signup", { ...payload, password: "***" }, expected, res, () => {
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(payload.email);
    expect(res.body.data.name).toBe(payload.name);
    expect(res.body.data.rollNumber).toBe(payload.rollNumber);
    expect(res.body.data.next).toBe("/signup/onboarding");
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.userStory).toBe(USER_STORY);
    // Single signed session cookie (backend/auth/session-cookies.ts), not the
    // old per-field sangam_user_id/name/email/faculty cookies (see #72).
    expect(client.getCookie("sangam_session")).toBeTruthy();
  });
});

it("normalizes email to lowercase", async () => {
  const base = uniqueIdentity("23u");
  const payload = { ...base, email: base.email.toUpperCase() };
  createdEmails.push(base.email);
  const res = await client.post(SIGNUP_PATH, payload);
  const expected = { status: 201, "data.email": base.email };

  reportCase("POST /api/auth/signup - email normalized to lowercase", { ...payload, password: "***" }, expected, res, () => {
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe(base.email);
  });
});

it("returns 409 for a duplicate email", async () => {
  const first = uniqueIdentity();
  createdEmails.push(first.email);
  const created = await client.post(SIGNUP_PATH, first);
  expect(created.status).toBe(201);

  const second = { ...first, name: "Duplicate Email", rollNumber: `${first.rollNumber}x` };
  const res = await client.post(SIGNUP_PATH, second);
  const expected = { status: 409, "error.code": "EMAIL_EXISTS", userStory: USER_STORY };

  reportCase("POST /api/auth/signup - duplicate email", { ...second, password: "***" }, expected, res, () => {
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("EMAIL_EXISTS");
    expect(res.body.userStory).toBe(USER_STORY);
  });
});

it("derives the roll number from the email's local part, ignoring any client-supplied value", async () => {
  const base = uniqueIdentity();
  const payload = { ...base, rollNumber: "not-the-real-roll-number" };
  createdEmails.push(payload.email);
  const res = await client.post(SIGNUP_PATH, payload);
  const expected = { status: 201, "data.rollNumber": base.rollNumber };

  reportCase("POST /api/auth/signup - roll number derived from email", { ...payload, password: "***" }, expected, res, () => {
    expect(res.status).toBe(201);
    expect(res.body.data.rollNumber).toBe(base.rollNumber);
    expect(res.body.data.rollNumber).not.toBe(payload.rollNumber);
  });
});

it("keeps the mock auth stub separate from real signup", async () => {
  const res = await client.get("/api/auth/session");
  const expected = { status: 200, mode: "mock" };

  reportCase("GET /api/auth/[...nextauth] - mock stub separate from real signup", "GET /api/auth/session", expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("mock");
  });
});
