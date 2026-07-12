import type { Metadata } from "next";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard } from "@/components/ui/primitives";
import { normalizeEventTags } from "@/lib/event-tags";
import { formatDayNumber } from "@/lib/format";
import { RegisterButton } from "./RegisterButton";
import { EventsTabPanel, EventsTabToggle } from "./EventsTabMotion";

export const metadata: Metadata = {
  title: "Events · Sangam",
  description: "Everything happening across your clubs.",
};

function spotsTakenFor(event: { going?: number | null; _count: { rsvps: number } }) {
  return Math.max(Number(event.going ?? 0), event._count.rsvps);
}

export default async function VolunteerEventsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab: "upcoming" | "past" = searchParams.tab === "past" ? "past" : "upcoming";
  const session = getMockSession();

  const list = await prisma.event.findMany({
    where: { status: tab },
    orderBy: { date: tab === "upcoming" ? "asc" : "desc" },
    include: { club: true, _count: { select: { rsvps: true } } },
  });

  const myRsvps = session?.user
    ? await prisma.rsvp.findMany({
        where: {
          userId: session.user.id,
          eventId: { in: list.map((event) => event.id) },
        },
      })
    : [];
  const registeredIds = new Set(myRsvps.map((rsvp) => rsvp.eventId));

  return (
    <>
      <PageHeader
        eyebrow="What's on"
        title={<>Events</>}
        description="Everything happening across your clubs."
        actions={<EventsTabToggle tab={tab} />}
      />

      <EventsTabPanel tab={tab}>
        {list.length === 0 && (
          <div className="night-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">
            No {tab} events yet.
          </div>
        )}

        {list.map((event) => {
          const tags = normalizeEventTags(event.tags);
          const category = tags[0] ?? "Event";
          const spotsTaken = spotsTakenFor(event);
          const registered = registeredIds.has(event.id);
          const isClosed = event.status === "past";
          const isFull = !registered && spotsTaken >= event.capacity;

          return (
            <GlassCard key={event.id} className="p-4" hover={false}>
              <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_6.75rem] sm:gap-x-6">
                <div className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.045] font-mono text-sm font-semibold tracking-tight text-white">
                  {formatDayNumber(event.date).padStart(2, "0")}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{event.title}</div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {event.venue}, {event.time}, {event.club.name}
                  </div>
                  <div className="mt-2 text-sm font-medium text-white/85 sm:hidden">{category}</div>
                </div>

                <div className="hidden justify-self-center text-sm font-medium text-white/85 sm:block">
                  {category}
                </div>

                <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center sm:gap-1.5">
                  <div className="font-mono text-xs tabular-nums text-muted-foreground">
                    {spotsTaken}/{event.capacity}
                  </div>
                  <RegisterButton
                    eventId={event.id}
                    eventSlug={event.slug}
                    initialRegistered={registered}
                    isFull={isFull}
                    isClosed={isClosed}
                  />
                </div>
              </div>
            </GlassCard>
          );
        })}
      </EventsTabPanel>
    </>
  );
}
