import { prisma } from "@/backend/db/prisma";
import { events as seededEvents } from "@/lib/seed-data";
import { getAuthCookieUserId } from "@/backend/auth/session-cookies";
import { getCurrentUserById } from "@/backend/auth/get-current-user";
import Landing, { type LandingEvent, type LandingViewer } from "./LandingClient";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const attendance = await prisma.event.findMany({
    where: { id: { in: seededEvents.map((event) => event.id) } },
    select: {
      id: true,
      _count: { select: { countMeIns: true } },
    },
  });
  const countByEventId = new Map(
    attendance.map((event) => [event.id, event._count.countMeIns]),
  );
  const events: LandingEvent[] = seededEvents.map((event) => ({
    ...event,
    attendeeCount: countByEventId.get(event.id) ?? 0,
  }));

  // Landing is also what a signed-in user hits by clicking the logo from
  // inside the app — without this, the nav always showed "Sign in / Join"
  // and looked exactly like a logout, even though the session was untouched
  // (see issue #117).
  let viewer: LandingViewer = null;
  const userId = getAuthCookieUserId();
  if (userId) {
    const result = await getCurrentUserById(userId);
    if (result.ok) {
      viewer = { name: result.user.name, home: result.user.home };
    }
  }

  return <Landing events={events} viewer={viewer} />;
}
