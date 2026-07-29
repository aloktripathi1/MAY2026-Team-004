/**
 * Integration tests for the Membership APIs (User Stories 1.2-1.5, 7.1):
 *   POST   /api/onboarding/interests
 *   POST   /api/members/bulk-import
 *   GET    /api/clubs/{id}/members
 *   POST   /api/clubs/{id}/members
 *   PATCH  /api/clubs/{id}/members/{memberId}
 *
 * Requires a running Sangam app + seeded database:
 *   npm run db:up && npm run db:push && npm run db:seed && npm run dev
 *   npm run test:integration
 *
 * Role-scoped endpoints (list/update members, bulk import) are exercised by
 * logging in as the seeded Admin account (Vishal, Admin of CodeChef only),
 * not by sending an anonymous request and relying on the old privileged
 * demo-persona fallback — that fallback is gated behind ALLOW_DEMO_SESSION
 * and off by default (see #81/#72).
 */
import { prisma } from "@/backend/db/prisma";
import { deleteMembershipsByIds, deleteUsersByEmails } from "./db-cleanup";
import { ApiClient, isApiAvailable, requireApiAvailable, reportCase, login, signupAndLogin, uniqueIdentity, CLUB_IDS, SEEDED_ACCOUNTS } from "./helpers";

const INTERESTS_PATH = "/api/onboarding/interests";
const BULK_IMPORT_PATH = "/api/members/bulk-import";

const createdEmails: string[] = [];
const createdMembershipIds: string[] = [];
let client: ApiClient;
let adminClient: ApiClient;

beforeAll(async () => {
  requireApiAvailable(await isApiAvailable());
  adminClient = new ApiClient();
  await login(adminClient, SEEDED_ACCOUNTS.admin.email, SEEDED_ACCOUNTS.admin.password);
});

beforeEach(() => {
  client = new ApiClient();
});

afterAll(async () => {
  if (createdMembershipIds.length > 0) {
    const deleted = await deleteMembershipsByIds(createdMembershipIds);
    console.log(`\n[cleanup] deleted ${deleted} test membership(s)`);
  }
  if (createdEmails.length > 0) {
    const deleted = await deleteUsersByEmails(createdEmails);
    console.log(`\n[cleanup] deleted ${deleted} test user(s): ${createdEmails.join(", ")}`);
  }
});

it("saves a valid interests selection", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signupAndLogin(client, identity);

  const payload = { interests: ["Technical", "Design"] };
  const res = await client.post(INTERESTS_PATH, payload);
  const expected = { status: 200, "data.interests": payload.interests, userStory: "7.1" };

  reportCase("POST /api/onboarding/interests - valid selection", payload, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.interests).toEqual(payload.interests);
    expect(res.body.userStory).toBe("7.1");
  });
});

it("rejects too many interests", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signupAndLogin(client, identity);

  const payload = { interests: ["Technical", "Cultural", "Sports", "Design", "Debate", "Writing"] };
  const res = await client.post(INTERESTS_PATH, payload);
  const expected = { status: 400, "error.code": "VALIDATION_ERROR" };

  reportCase("POST /api/onboarding/interests - too many interests", payload, expected, res, () => {
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

it("creates a pending membership when joining a new club", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signupAndLogin(client, identity);

  const res = await client.post(`/api/clubs/${CLUB_IDS.arena}/members`);
  const expected = { status: 201, "data.membership.status": "Pending", userStory: "1.3" };

  reportCase(`POST /api/clubs/${CLUB_IDS.arena}/members - new join request`, {}, expected, res, () => {
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.membership.status).toBe("Pending");
    expect(res.body.data.membership.clubId).toBe(CLUB_IDS.arena);
    expect(res.body.userStory).toBe("1.3");
    createdMembershipIds.push(res.body.data.membership.id);
  });
});

it("returns 409 for a duplicate join request", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signupAndLogin(client, identity);

  const first = await client.post(`/api/clubs/${CLUB_IDS.arena}/members`);
  expect(first.status).toBe(201);
  createdMembershipIds.push(first.body.data.membership.id);

  const res = await client.post(`/api/clubs/${CLUB_IDS.arena}/members`);
  const expected = { status: 409, "error.code": "ALREADY_MEMBER" };

  reportCase(`POST /api/clubs/${CLUB_IDS.arena}/members - duplicate join request`, {}, expected, res, () => {
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_MEMBER");
  });
});

it("returns 201 and 409 for simultaneous duplicate join requests", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signupAndLogin(client, identity);

  const path = `/api/clubs/${CLUB_IDS.arena}/members`;
  const responses = await Promise.all([client.post(path), client.post(path)]);
  const statuses = responses.map((response) => response.status).sort();

  expect(statuses).toEqual([201, 409]);

  const created = responses.find((response) => response.status === 201);
  const duplicate = responses.find((response) => response.status === 409);
  expect(created?.body.data.membership.status).toBe("Pending");
  expect(duplicate?.body.error.code).toBe("ALREADY_MEMBER");

  createdMembershipIds.push(created!.body.data.membership.id);
  const membershipCount = await prisma.membership.count({
    where: { clubId: CLUB_IDS.arena, user: { email: identity.email } },
  });
  expect(membershipCount).toBe(1);
});

it("returns 404 for an unknown club", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signupAndLogin(client, identity);

  const res = await client.post("/api/clubs/does-not-exist/members");
  const expected = { status: 404, "error.code": "CLUB_NOT_FOUND" };

  reportCase("POST /api/clubs/does-not-exist/members - unknown club", {}, expected, res, () => {
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("CLUB_NOT_FOUND");
  });
});

it("lists members for the club's own admin", async () => {
  const res = await adminClient.get(`/api/clubs/${CLUB_IDS.codechef}/members`);
  const expected = { status: 200, userStory: "1.2" };

  reportCase(`GET /api/clubs/${CLUB_IDS.codechef}/members - admin view`, {}, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.members)).toBe(true);
    expect(res.body.userStory).toBe("1.2");
  });
});

it("forbids listing members of a club the caller doesn't administer", async () => {
  const res = await adminClient.get(`/api/clubs/${CLUB_IDS.arena}/members`);
  const expected = { status: 403, "error.code": "FORBIDDEN" };

  reportCase(`GET /api/clubs/${CLUB_IDS.arena}/members - not an admin of this club`, {}, expected, res, () => {
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

it("lets the club admin update a membership's status", async () => {
  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signupAndLogin(client, identity);
  const join = await client.post(`/api/clubs/${CLUB_IDS.codechef}/members`);
  expect(join.status).toBe(201);
  const membershipId = join.body.data.membership.id;
  createdMembershipIds.push(membershipId);

  const payload = { status: "Active" };
  const res = await adminClient.patch(`/api/clubs/${CLUB_IDS.codechef}/members/${membershipId}`, payload);
  const expected = { status: 200, "data.membership.status": "Active", userStory: "1.4" };

  reportCase(`PATCH /api/clubs/${CLUB_IDS.codechef}/members/{memberId} - admin approves`, payload, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.data.membership.status).toBe("Active");
    expect(res.body.userStory).toBe("1.4");
  });
});

it("returns 404 when updating an unknown membership", async () => {
  const res = await adminClient.patch(`/api/clubs/${CLUB_IDS.codechef}/members/does-not-exist`, { status: "Active" });
  const expected = { status: 404, "error.code": "MEMBERSHIP_NOT_FOUND" };

  reportCase("PATCH .../members/does-not-exist - unknown membership", { status: "Active" }, expected, res, () => {
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("MEMBERSHIP_NOT_FOUND");
  });
});

it("bulk-imports members for the club's own admin", async () => {
  const email = `pytest.bulk.import.${Date.now()}@ds.study.iitm.ac.in`;
  createdEmails.push(email);
  const payload = { clubId: CLUB_IDS.codechef, rows: [{ name: "Jest Bulk User", roll: `23tbulk${Date.now()}`, email, role: "Member" }] };
  const res = await adminClient.post(BULK_IMPORT_PATH, payload);
  const expected = { status: 200, "data.imported": 1, "data.skipped": 0, userStory: "1.5" };

  reportCase("POST /api/members/bulk-import - one valid row", payload, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.data.imported).toBe(1);
    expect(res.body.data.skipped).toBe(0);
    expect(res.body.userStory).toBe("1.5");
  });
});

it("handles simultaneous identical bulk imports without server errors", async () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const rows = [0, 1].map((index) => ({
    name: `Concurrent Bulk User ${index}`,
    roll: `23tconcurrent${suffix}${index}`,
    email: `pytest.bulk.concurrent.${suffix}.${index}@ds.study.iitm.ac.in`,
    role: "Member",
  }));
  createdEmails.push(...rows.map((row) => row.email));
  const payload = { clubId: CLUB_IDS.codechef, rows };

  const responses = await Promise.all([
    adminClient.post(BULK_IMPORT_PATH, payload),
    adminClient.post(BULK_IMPORT_PATH, payload),
  ]);

  expect(responses.map((response) => response.status).sort()).toEqual([200, 200]);
  expect(responses.reduce((total, response) => total + response.body.data.imported, 0)).toBe(2);
  expect(responses.reduce((total, response) => total + response.body.data.skipped, 0)).toBe(2);

  const userCount = await prisma.user.count({ where: { email: { in: rows.map((row) => row.email) } } });
  const membershipCount = await prisma.membership.count({
    where: { clubId: CLUB_IDS.codechef, user: { email: { in: rows.map((row) => row.email) } } },
  });
  expect(userCount).toBe(2);
  expect(membershipCount).toBe(2);
});

it("forbids bulk import for a club the caller doesn't administer", async () => {
  const payload = { clubId: CLUB_IDS.arena, rows: [{ name: "Nope", roll: "23tnope0001", email: "nope@ds.study.iitm.ac.in" }] };
  const res = await adminClient.post(BULK_IMPORT_PATH, payload);
  const expected = { status: 403, "error.code": "FORBIDDEN" };

  reportCase("POST /api/members/bulk-import - not an admin of target club", payload, expected, res, () => {
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

it("rejects an empty rows array", async () => {
  const payload = { clubId: CLUB_IDS.codechef, rows: [] };
  const res = await adminClient.post(BULK_IMPORT_PATH, payload);
  const expected = { status: 400, "error.code": "VALIDATION_ERROR" };

  reportCase("POST /api/members/bulk-import - empty rows array", payload, expected, res, () => {
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

it("rejects more than 500 rows", async () => {
  const rows = Array.from({ length: 501 }, (_, i) => ({ name: `Bulk ${i}`, roll: `bulk${i}${Date.now()}`, email: `bulk${i}${Date.now()}@ds.study.iitm.ac.in` }));
  const payload = { clubId: CLUB_IDS.codechef, rows };
  const res = await adminClient.post(BULK_IMPORT_PATH, payload);
  const expected = { status: 400, "error.code": "VALIDATION_ERROR" };

  reportCase("POST /api/members/bulk-import - over 500 rows rejected (see #46)", { clubId: payload.clubId, rowCount: rows.length }, expected, res, () => {
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
