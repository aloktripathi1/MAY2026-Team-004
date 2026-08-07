/**
 * Cross-view regression coverage for issue #99. All operational event views
 * must render the CountMeIn row count, never the legacy Event.going value.
 */
import { prisma } from "@/backend/db/prisma";
import {
  ApiClient,
  BASE_URL,
  CLUB_IDS,
  isApiAvailable,
  login,
  requireApiAvailable,
  SEEDED_ACCOUNTS,
} from "./helpers";

let client: ApiClient;

beforeAll(async () => {
  requireApiAvailable(await isApiAvailable());
  client = new ApiClient();
  await login(
    client,
    SEEDED_ACCOUNTS.demo.email,
    SEEDED_ACCOUNTS.demo.password,
  );
});

async function getPageHtml(path: string, authenticated = true) {
  const cookie = authenticated
    ? `sangam_session=${client.getCookie("sangam_session")}`
    : undefined;
  const response = await fetch(new URL(path, BASE_URL), {
    headers: cookie ? { Cookie: cookie } : undefined,
  });
  expect(response.status).toBe(200);
  return response.text();
}

/** Every event id a page rendered a live attendance figure for. */
function renderedEventIds(html: string): Set<string> {
  return new Set([...html.matchAll(/data-event-attendance="([^"]+)"/g)].map((m) => m[1]));
}

function renderedAttendance(html: string, eventId: string) {
  const match = html.match(
    new RegExp(`data-event-attendance="${eventId}"[^>]*data-attendance-count="(\\d+)"`),
  );
  expect(match).not.toBeNull();
  return Number(match![1]);
}

it("uses the same live registration count in API, member, volunteer, admin, and public views", async () => {
  const [publicHtml, memberHtml, volunteerHtml, adminHtml] = await Promise.all([
    getPageHtml("/", false),
    getPageHtml("/app"),
    getPageHtml("/volunteer/events"),
    getPageHtml("/admin"),
  ]);

  // The event is discovered rather than hard-coded. Each view renders a
  // different slice — the landing page shows only the next three *upcoming*
  // events, so the id this test used to pin (a past event) could never appear
  // there and the test failed regardless of the behaviour it was checking.
  // Intersecting the views finds an event they all show, which is the only
  // place the cross-view invariant can actually be observed.
  const pages = { public: publicHtml, member: memberHtml, volunteer: volunteerHtml, admin: adminHtml };
  const shared = [...renderedEventIds(publicHtml)].filter((id) =>
    Object.values(pages).every((html) => renderedEventIds(html).has(id)),
  );

  expect(shared.length).toBeGreaterThan(0);

  const apiResponse = await client.get("/api/events", { clubId: CLUB_IDS.codechef });
  expect(apiResponse.status).toBe(200);

  for (const eventId of shared) {
    const expectedCount = await prisma.countMeIn.count({ where: { eventId } });
    const apiEvent = apiResponse.body.data.events.find((event: { id: string }) => event.id === eventId);

    expect({
      eventId,
      api: apiEvent?._count.countMeIns,
      public: renderedAttendance(publicHtml, eventId),
      member: renderedAttendance(memberHtml, eventId),
      volunteer: renderedAttendance(volunteerHtml, eventId),
      admin: renderedAttendance(adminHtml, eventId),
    }).toEqual({
      eventId,
      api: expectedCount,
      public: expectedCount,
      member: expectedCount,
      volunteer: expectedCount,
      admin: expectedCount,
    });
  }
});
