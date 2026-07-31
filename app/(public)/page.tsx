import { prisma } from "@/backend/db/prisma";
import { events as seededEvents } from "@/lib/seed-data";
import Landing, { type LandingEvent } from "./LandingClient";

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

  return <Landing events={events} />;
}
