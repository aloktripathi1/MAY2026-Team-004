/**
 * Integration tests for the Event Management APIs (User Stories 2.1-2.8):
 *   POST   /api/events
 *   GET    /api/events
 *   GET    /api/events/{id}
 *   PATCH  /api/events/{id}
 *   POST   /api/events/{id}/register
 *   POST   /api/events/{id}/checkin
 *   GET    /api/events/{id}/participants
 *   GET    /api/events/conflicts
 *   POST   /api/events/{id}/approve
 *   PATCH  /api/events/{id}/lock
 *
 * Requires a running Sangam app + seeded database:
 *   npm run db:up && npm run db:push && npm run db:seed && npm run dev
 *   npm run test:integration
 *
 * Coordinator/Admin/Faculty-scoped endpoints are exercised by logging in as
 * the matching seeded team account instead of sending an anonymous request
 * and relying on the old privileged demo-persona fallback (see #81/#72):
 *   - coordinatorClient: Purnendu, Coordinator of E-Cell (c6) only
 *   - facultyClient: Alok, isFaculty true, no club membership
 * The plain member side (registering/cancelling Count Me In) always uses a
 * fresh real signup + login, exactly as the original suite did.
 */
import { deleteEventsByIds, deleteUsersByEmails } from "./db-cleanup";
import {
  ApiClient,
  isApiAvailable,
  requireApiAvailable,
  reportCase,
  login,
  signupAndLogin,
  uniqueIdentity,
  CLUB_IDS,
  SEEDED_ACCOUNTS,
} from "./helpers";

const EVENTS_PATH = "/api/events";
const CONFLICTS_PATH = "/api/events/conflicts";
/** Sarga (c3) event; the coordinator test account holds no role there at all. */
const VOLUNTEER_ONLY_EVENT_ID = "e1";

const createdEmails: string[] = [];
const createdEventIds: string[] = [];
let client: ApiClient;
let coordinatorClient: ApiClient;
let facultyClient: ApiClient;

beforeAll(async () => {
  requireApiAvailable(await isApiAvailable());
  coordinatorClient = new ApiClient();
  await login(coordinatorClient, SEEDED_ACCOUNTS.coordinator.email, SEEDED_ACCOUNTS.coordinator.password);
  facultyClient = new ApiClient();
  await login(facultyClient, SEEDED_ACCOUNTS.faculty.email, SEEDED_ACCOUNTS.faculty.password);
});

beforeEach(() => {
  client = new ApiClient();
});

afterAll(async () => {
  if (createdEventIds.length > 0) {
    const deleted = await deleteEventsByIds(createdEventIds);
    console.log(`\n[cleanup] deleted ${deleted} test event(s)`);
  }
  if (createdEmails.length > 0) {
    const deleted = await deleteUsersByEmails(createdEmails);
    console.log(`\n[cleanup] deleted ${deleted} test user(s): ${createdEmails.join(", ")}`);
  }
});

function newEventPayload(overrides: Record<string, unknown> = {}) {
  return {
    clubId: CLUB_IDS.eCell,
    title: "Jest Integration Event",
    description: "Created by the automated API integration suite.",
    date: "2026-09-01",
    time: "18:00",
    venue: "Jest Hall",
    capacity: 10,
    ...overrides,
  };
}

it("lets a coordinator create an event for their own club", async () => {
  const payload = newEventPayload();
  const res = await coordinatorClient.post(EVENTS_PATH, payload);
  const expected = { status: 201, "data.event.approval": "pending", userStory: "2.1" };

  reportCase("POST /api/events - coordinator creates event", payload, expected, res, () => {
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.event.title).toBe(payload.title);
    expect(res.body.data.event.approval).toBe("pending");
    expect(res.body.data.event.registrationLocked).toBe(false);
    expect(res.body.userStory).toBe("2.1");
    createdEventIds.push(res.body.data.event.id);
  });
});

it("forbids creating an event for a club the caller doesn't coordinate", async () => {
  const payload = newEventPayload({ clubId: CLUB_IDS.arena });
  const res = await coordinatorClient.post(EVENTS_PATH, payload);
  const expected = { status: 403, "error.code": "FORBIDDEN" };

  reportCase("POST /api/events - not a coordinator of target club", payload, expected, res, () => {
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

it("rejects a missing title", async () => {
  const payload = newEventPayload();
  delete (payload as any).title;
  const res = await coordinatorClient.post(EVENTS_PATH, payload);
  const expected = { status: 400, "error.code": "VALIDATION_ERROR" };

  reportCase("POST /api/events - missing title", payload, expected, res, () => {
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

it("lists events filtered by club", async () => {
  const created = await coordinatorClient.post(EVENTS_PATH, newEventPayload({ title: "Jest Filter Event" }));
  expect(created.status).toBe(201);
  createdEventIds.push(created.body.data.event.id);

  const res = await coordinatorClient.get(EVENTS_PATH, { clubId: CLUB_IDS.eCell });
  const expected = { status: 200, userStory: "2.5" };

  reportCase(`GET /api/events?clubId=${CLUB_IDS.eCell}`, {}, expected, res, () => {
    expect(res.status).toBe(200);
    const events = res.body.data.events;
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e: any) => e.clubId === CLUB_IDS.eCell)).toBe(true);
    expect(events.every((e: any) => typeof e._count.countMeIns === "number")).toBe(true);
    expect(res.body.userStory).toBe("2.5");
  });
});

it("gets an event's detail", async () => {
  const created = await coordinatorClient.post(EVENTS_PATH, newEventPayload({ title: "Jest Detail Event" }));
  expect(created.status).toBe(201);
  const eventId = created.body.data.event.id;
  createdEventIds.push(eventId);

  const res = await coordinatorClient.get(`${EVENTS_PATH}/${eventId}`);
  const expected = { status: 200, "data.event.id": eventId };

  reportCase(`GET /api/events/${eventId}`, {}, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.data.event.id).toBe(eventId);
  });
});

it("returns 404 for an unknown event", async () => {
  const res = await coordinatorClient.get(`${EVENTS_PATH}/does-not-exist`);
  const expected = { status: 404, "error.code": "EVENT_NOT_FOUND" };

  reportCase("GET /api/events/does-not-exist", {}, expected, res, () => {
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("EVENT_NOT_FOUND");
  });
});

it("lets a coordinator update their own event", async () => {
  const created = await coordinatorClient.post(EVENTS_PATH, newEventPayload({ title: "Jest Update Before" }));
  expect(created.status).toBe(201);
  const eventId = created.body.data.event.id;
  createdEventIds.push(eventId);

  const payload = { title: "Jest Update After" };
  const res = await coordinatorClient.patch(`${EVENTS_PATH}/${eventId}`, payload);
  const expected = { status: 200, "data.event.title": "Jest Update After", userStory: "2.2" };

  reportCase(`PATCH /api/events/${eventId} - coordinator edits title`, payload, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.data.event.title).toBe("Jest Update After");
    expect(res.body.userStory).toBe("2.2");
  });
});

it("forbids updating an event outside the caller's club", async () => {
  const payload = { title: "Should not be applied" };
  const res = await coordinatorClient.patch(`${EVENTS_PATH}/${VOLUNTEER_ONLY_EVENT_ID}`, payload);
  const expected = { status: 403, "error.code": "FORBIDDEN" };

  reportCase(`PATCH /api/events/${VOLUNTEER_ONLY_EVENT_ID} - not this coordinator's club`, payload, expected, res, () => {
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

it("registers then cancels via the same toggle endpoint", async () => {
  const created = await coordinatorClient.post(EVENTS_PATH, newEventPayload({ title: "Jest Register Event" }));
  expect(created.status).toBe(201);
  const eventId = created.body.data.event.id;
  createdEventIds.push(eventId);

  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signupAndLogin(client, identity);

  const register = await client.post(`${EVENTS_PATH}/${eventId}/register`);
  reportCase(`POST /api/events/${eventId}/register - first call`, {}, { status: 200, "data.action": "registered" }, register, () => {
    expect(register.status).toBe(200);
    expect(register.body.data.action).toBe("registered");
  });

  const cancel = await client.post(`${EVENTS_PATH}/${eventId}/register`);
  reportCase(`POST /api/events/${eventId}/register - second call toggles off`, {}, { status: 200, "data.action": "cancelled" }, cancel, () => {
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.action).toBe("cancelled");
  });
});

it("lets the coordinator check an attendee in", async () => {
  const created = await coordinatorClient.post(EVENTS_PATH, newEventPayload({ title: "Jest Checkin Event" }));
  expect(created.status).toBe(201);
  const eventId = created.body.data.event.id;
  createdEventIds.push(eventId);

  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  const attendee = new ApiClient();
  await signupAndLogin(attendee, identity);
  const register = await attendee.post(`${EVENTS_PATH}/${eventId}/register`);
  expect(register.status).toBe(200);

  const participants = await coordinatorClient.get(`${EVENTS_PATH}/${eventId}/participants`);
  expect(participants.status).toBe(200);
  const rows = participants.body.data.participants;
  expect(rows).toHaveLength(1);
  const countMeInId = rows[0].id;

  const payload = { countMeInId };
  const res = await coordinatorClient.post(`${EVENTS_PATH}/${eventId}/checkin`, payload);
  const expected = { status: 200, "data.countMeIn.checkedIn": true, userStory: "2.7" };

  reportCase(`POST /api/events/${eventId}/checkin`, payload, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.data.countMeIn.checkedIn).toBe(true);
    expect(res.body.userStory).toBe("2.7");
  });
});

it("forbids viewing participants outside the caller's club", async () => {
  const res = await coordinatorClient.get(`${EVENTS_PATH}/${VOLUNTEER_ONLY_EVENT_ID}/participants`);
  const expected = { status: 403, "error.code": "FORBIDDEN" };

  reportCase(`GET /api/events/${VOLUNTEER_ONLY_EVENT_ID}/participants - not this coordinator's club`, {}, expected, res, () => {
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

it("detects a double-booked venue and date", async () => {
  const first = await coordinatorClient.post(EVENTS_PATH, newEventPayload({ title: "Jest Conflict A", date: "2026-09-15", venue: "Shared Hall" }));
  expect(first.status).toBe(201);
  createdEventIds.push(first.body.data.event.id);

  const second = await coordinatorClient.post(EVENTS_PATH, newEventPayload({ title: "Jest Conflict B", date: "2026-09-15", venue: "Shared Hall" }));
  expect(second.status).toBe(201);
  createdEventIds.push(second.body.data.event.id);

  const res = await coordinatorClient.get(CONFLICTS_PATH, { date: "2026-09-15", venue: "Shared Hall" });
  const expected = { status: 200, "data.hasConflict": true, userStory: "2.4" };

  reportCase("GET /api/events/conflicts - same date+venue", { date: "2026-09-15", venue: "Shared Hall" }, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.data.hasConflict).toBe(true);
    const conflictIds = new Set(res.body.data.conflicts.map((c: any) => c.id));
    expect(conflictIds.has(first.body.data.event.id)).toBe(true);
    expect(conflictIds.has(second.body.data.event.id)).toBe(true);
    expect(res.body.userStory).toBe("2.4");
  });
});

it("requires date and venue query params", async () => {
  const res = await coordinatorClient.get(CONFLICTS_PATH);
  const expected = { status: 400, "error.code": "VALIDATION_ERROR" };

  reportCase("GET /api/events/conflicts - missing query params", {}, expected, res, () => {
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

it("lets faculty approve an event", async () => {
  const created = await coordinatorClient.post(EVENTS_PATH, newEventPayload({ title: "Jest Approve Event" }));
  expect(created.status).toBe(201);
  const eventId = created.body.data.event.id;
  createdEventIds.push(eventId);

  const payload = { approval: "approved" };
  const res = await facultyClient.post(`${EVENTS_PATH}/${eventId}/approve`, payload);
  const expected = { status: 200, "data.event.approval": "approved", userStory: "2.8" };

  reportCase(`POST /api/events/${eventId}/approve - faculty approves`, payload, expected, res, () => {
    expect(res.status).toBe(200);
    expect(res.body.data.event.approval).toBe("approved");
    expect(res.body.userStory).toBe("2.8");
  });
});

it("forbids approval by a non-faculty user", async () => {
  const created = await coordinatorClient.post(EVENTS_PATH, newEventPayload({ title: "Jest Non-Faculty Approve" }));
  expect(created.status).toBe(201);
  const eventId = created.body.data.event.id;
  createdEventIds.push(eventId);

  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  await signupAndLogin(client, identity); // fresh user, isFaculty false

  const payload = { approval: "approved" };
  const res = await client.post(`${EVENTS_PATH}/${eventId}/approve`, payload);
  const expected = { status: 403, "error.code": "FORBIDDEN", message: "Faculty only." };

  reportCase(`POST /api/events/${eventId}/approve - non-faculty user`, payload, expected, res, () => {
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.error.message).toBe("Faculty only.");
  });
});

it("blocks new registrations once the coordinator locks registration", async () => {
  const created = await coordinatorClient.post(EVENTS_PATH, newEventPayload({ title: "Jest Lock Event" }));
  expect(created.status).toBe(201);
  const eventId = created.body.data.event.id;
  createdEventIds.push(eventId);

  const lockRes = await coordinatorClient.patch(`${EVENTS_PATH}/${eventId}/lock`, { locked: true });
  reportCase(
    `PATCH /api/events/${eventId}/lock - locks registration`,
    { locked: true },
    { status: 200, "data.event.registrationLocked": true, userStory: "2.6" },
    lockRes,
    () => {
      expect(lockRes.status).toBe(200);
      expect(lockRes.body.data.event.registrationLocked).toBe(true);
      expect(lockRes.body.userStory).toBe("2.6");
    },
  );

  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  const attendee = new ApiClient();
  await signupAndLogin(attendee, identity);
  const register = await attendee.post(`${EVENTS_PATH}/${eventId}/register`);

  reportCase(
    `POST /api/events/${eventId}/register - blocked while locked`,
    {},
    { status: 409, "error.code": "REGISTRATION_LOCKED" },
    register,
    () => {
      expect(register.status).toBe(409);
      expect(register.body.error.code).toBe("REGISTRATION_LOCKED");
    },
  );
});

it("forbids locking an event outside the caller's club", async () => {
  const res = await coordinatorClient.patch(`${EVENTS_PATH}/${VOLUNTEER_ONLY_EVENT_ID}/lock`, { locked: true });
  const expected = { status: 403, "error.code": "FORBIDDEN" };

  reportCase(`PATCH /api/events/${VOLUNTEER_ONLY_EVENT_ID}/lock - not this coordinator's club`, { locked: true }, expected, res, () => {
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});
