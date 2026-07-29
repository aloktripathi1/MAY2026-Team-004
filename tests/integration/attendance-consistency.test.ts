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

const EVENT_ID = "e2";
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

function renderedAttendance(html: string) {
  const match = html.match(
    new RegExp(
      `data-event-attendance="${EVENT_ID}"[^>]*data-attendance-count="(\\d+)"`,
    ),
  );
  expect(match).not.toBeNull();
  return Number(match![1]);
}

it("uses the same live registration count in API, member, volunteer, admin, and public views", async () => {
  const expectedCount = await prisma.countMeIn.count({
    where: { eventId: EVENT_ID },
  });

  const apiResponse = await client.get("/api/events", {
    clubId: CLUB_IDS.codechef,
  });
  expect(apiResponse.status).toBe(200);
  const apiEvent = apiResponse.body.data.events.find(
    (event: { id: string }) => event.id === EVENT_ID,
  );

  const [publicHtml, memberHtml, volunteerHtml, adminHtml] = await Promise.all([
    getPageHtml("/", false),
    getPageHtml("/app"),
    getPageHtml("/volunteer/events"),
    getPageHtml("/admin"),
  ]);

  expect({
    api: apiEvent._count.countMeIns,
    public: renderedAttendance(publicHtml),
    member: renderedAttendance(memberHtml),
    volunteer: renderedAttendance(volunteerHtml),
    admin: renderedAttendance(adminHtml),
  }).toEqual({
    api: expectedCount,
    public: expectedCount,
    member: expectedCount,
    volunteer: expectedCount,
    admin: expectedCount,
  });
});
