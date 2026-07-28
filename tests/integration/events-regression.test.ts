/**
 * Regression coverage for two bugs fixed this milestone that the original
 * pytest suite predates:
 *   - #73: concurrent Count Me In requests could overbook an event past
 *     capacity (fixed with a Serializable transaction).
 *   - #66/#89: a stale "upcoming" status field (never auto-transitions)
 *     let past events still accept registrations.
 *
 * Requires a running Sangam app + seeded database:
 *   npm run db:up && npm run db:push && npm run db:seed && npm run dev
 *   npm run test:integration
 */
import { deleteEventsByIds, deleteUsersByEmails } from "./db-cleanup";
import { ApiClient, isApiAvailable, requireApiAvailable, reportCase, login, signupAndLogin, uniqueIdentity, CLUB_IDS, SEEDED_ACCOUNTS } from "./helpers";

const EVENTS_PATH = "/api/events";
const createdEmails: string[] = [];
const createdEventIds: string[] = [];
let coordinatorClient: ApiClient;

beforeAll(async () => {
  requireApiAvailable(await isApiAvailable());
  coordinatorClient = new ApiClient();
  await login(coordinatorClient, SEEDED_ACCOUNTS.coordinator.email, SEEDED_ACCOUNTS.coordinator.password);
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

it("lets exactly one of 10 truly simultaneous requests win the last capacity spot (#73)", async () => {
  const created = await coordinatorClient.post(EVENTS_PATH, {
    clubId: CLUB_IDS.eCell,
    title: "Jest Capacity Race Event",
    description: "Capacity-1 event used to stress-test the registration transaction.",
    date: "2026-09-20",
    time: "18:00",
    venue: "Jest Race Hall",
    capacity: 1,
  });
  expect(created.status).toBe(201);
  const eventId = created.body.data.event.id;
  createdEventIds.push(eventId);

  const racers: ApiClient[] = [];
  for (let i = 0; i < 10; i += 1) {
    const identity = uniqueIdentity("23r");
    createdEmails.push(identity.email);
    const racer = new ApiClient();
    await signupAndLogin(racer, identity);
    racers.push(racer);
  }

  // Fire all 10 registration requests at once - the only way to actually
  // exercise the Serializable-transaction fix rather than a sequential race.
  const responses = await Promise.all(racers.map((r) => r.post(`${EVENTS_PATH}/${eventId}/register`)));
  const succeeded = responses.filter((r) => r.status === 200 && r.body.success);
  const rejected = responses.filter((r) => !(r.status === 200 && r.body.success));

  const expected = { winners: 1, losers: 9, loserCode: "REGISTRATION_UNAVAILABLE" };
  const actual = {
    winners: succeeded.length,
    losers: rejected.length,
    loserCodes: [...new Set(rejected.map((r) => r.body.error?.code))],
  };

  reportCase("POST /api/events/{id}/register x10 simultaneous - capacity 1", { capacity: 1, concurrentRequests: 10 }, expected, actual, () => {
    expect(succeeded).toHaveLength(1);
    expect(rejected).toHaveLength(9);
    expect(rejected.every((r) => r.body.error?.code === "REGISTRATION_UNAVAILABLE")).toBe(true);
  });
});

it("rejects registration for an event whose date has passed, even with a stale 'upcoming' status (#66/#89)", async () => {
  const created = await coordinatorClient.post(EVENTS_PATH, {
    clubId: CLUB_IDS.eCell,
    title: "Jest Past Event",
    description: "Created with a past date; status defaults to upcoming and is never flipped automatically.",
    date: "2020-01-01",
    time: "10:00",
    venue: "Jest Hall",
    capacity: 10,
  });
  expect(created.status).toBe(201);
  const eventId = created.body.data.event.id;
  createdEventIds.push(eventId);
  expect(created.body.data.event.status).toBe("upcoming"); // stale by construction

  const identity = uniqueIdentity();
  createdEmails.push(identity.email);
  const client = new ApiClient();
  await signupAndLogin(client, identity);

  const res = await client.post(`${EVENTS_PATH}/${eventId}/register`);
  const expected = { status: 400, "error.code": "REGISTRATION_UNAVAILABLE" };

  reportCase(`POST /api/events/${eventId}/register - date passed, status still "upcoming"`, { eventDate: "2020-01-01", storedStatus: "upcoming" }, expected, res, () => {
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("REGISTRATION_UNAVAILABLE");
  });
});
