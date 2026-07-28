/**
 * Cross-cutting security integration tests: anonymous access, forged
 * sessions, cross-role authorization, and 404 handling for missing
 * dynamic pages. Covers the #81/#72/#68 fixes at the HTTP level, on top
 * of the endpoint-specific coverage in the other integration files.
 *
 * Requires a running Sangam app + seeded database:
 *   npm run db:up && npm run db:push && npm run db:seed && npm run dev
 *   npm run test:integration
 */
import { deleteUsersByEmails } from "./db-cleanup";
import { ApiClient, isApiAvailable, requireApiAvailable, reportCase, signupAndLogin, uniqueIdentity, BASE_URL, CLUB_IDS } from "./helpers";

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

describe("anonymous access to protected pages", () => {
  it.each(["/admin", "/coordinator", "/volunteer", "/faculty", "/app"])("redirects %s to /login instead of granting a privileged session", async (path) => {
    const res = await fetch(new URL(path, BASE_URL), { redirect: "manual" });
    const expected = { status: [307, 302], location: "/login" };
    const actual = { status: res.status, location: res.headers.get("location") };

    reportCase(`GET ${path} - anonymous request`, "no session cookie", expected, actual, () => {
      expect([307, 302]).toContain(res.status);
      expect(res.headers.get("location")).toContain("/login");
    });
  });
});

describe("anonymous access to protected APIs", () => {
  it("returns 401 for GET /api/auth/me", async () => {
    const res = await client.get("/api/auth/me");
    reportCase("GET /api/auth/me - anonymous", "no session cookie", { status: 401 }, res, () => {
      expect(res.status).toBe(401);
    });
  });

  it("returns 401, not a page redirect, for POST /api/events", async () => {
    const res = await client.post("/api/events", { clubId: CLUB_IDS.eCell, title: "x", description: "x", date: "2026-09-01", time: "10:00", venue: "x", capacity: 5 });
    reportCase("POST /api/events - anonymous", "no session cookie", { status: 401 }, res, () => {
      expect(res.status).toBe(401);
    });
  });
});

it("rejects a session cookie with a bad signature rather than treating it as valid", async () => {
  const forged = new ApiClient();
  forged.setCookie("sangam_session", "u1.0000000000000000000000000000000000000000000000000000000000000000");
  const res = await forged.get("/api/auth/me");

  reportCase("GET /api/auth/me - forged session signature", "sangam_session=u1.<bad signature>", { status: 401 }, res, () => {
    expect(res.status).toBe(401);
  });
});

it("forbids a member from calling an admin-only endpoint (not just hiding the UI)", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signupAndLogin(client, identity);

  const res = await client.post("/api/members/bulk-import", { clubId: CLUB_IDS.codechef, rows: [{ name: "x", roll: "x123", email: "x@ds.study.iitm.ac.in" }] });

  reportCase("POST /api/members/bulk-import - member, not an admin", "member session, no admin membership", { status: 403 }, res, () => {
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("404 handling for missing dynamic pages", () => {
  it("returns a real 404 for a missing event, not a 200 with a not-found page (#68)", async () => {
    const identity = uniqueIdentity();
    createdEmails.push(identity.email);
    const authed = new ApiClient();
    await signupAndLogin(authed, identity);

    const res = await fetch(new URL("/app/events/not-a-real-event-slug", BASE_URL), {
      headers: { Cookie: `sangam_session=${authed.getCookie("sangam_session")}` },
    });

    reportCase("GET /app/events/not-a-real-event-slug - authenticated", identity.email, { status: 404 }, { status: res.status }, () => {
      expect(res.status).toBe(404);
    });
  });

  it("returns a real 404 for an unmatched top-level route", async () => {
    const res = await fetch(new URL("/does-not-exist", BASE_URL));
    reportCase("GET /does-not-exist", "no session cookie", { status: 404 }, { status: res.status }, () => {
      expect(res.status).toBe(404);
    });
  });
});
