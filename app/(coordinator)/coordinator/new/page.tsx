import type { Metadata } from "next";
import Link from "next/link";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { formatEventDate } from "@/lib/format";
import { NewEventModal } from "@/components/coordinator/NewEventModal";
import { Calendar, MapPin, Users, Tag } from "lucide-react";

import { normalizeEventTags } from "@/lib/event-tags";

export const metadata: Metadata = {
  title: "All Events · Sangam",
  description: "Full history and past records of events.",
};

export default async function AllEventsPage() {
  const session = getMockSession();
  const membership = getPrimaryClubMembership(session!, "Coordinator");
  const clubId = membership!.clubId;

  const events = await prisma.event.findMany({
    where: { clubId },
    orderBy: { date: "desc" },
    include: { _count: { select: { rsvps: true } } },
  });

  return (
    <>
      <PageHeader
        title={<>All <span className="text-secondary">events.</span></>}
        description="Full history and records of events hosted by your club."
        actions={<NewEventModal />}
      />

      <div className="max-w-4xl space-y-4">
        {events.length === 0 && (
          <GlassCard className="p-8 text-center text-sm text-muted-foreground">
            No events found. Click "New event" above to publish one.
          </GlassCard>
        )}

        {events.map((e) => {
          const tagsList = normalizeEventTags(e.tags);
          return (
            <Link key={e.id} href={`/coordinator/events/${e.slug}`} className="block">
              <GlassCard className="p-5 transition hover:border-white/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10"
                      style={{ background: e.cover }}
                    >
                      {e.photo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.photo} alt="" loading="lazy" className="h-full w-full object-cover" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-white">{e.title}</span>
                        <StatusPill tone={e.status === "live" ? "green" : e.status === "upcoming" ? "amber" : "slate"}>
                          {e.status}
                        </StatusPill>
                        {e.approval && (
                          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs text-muted-foreground capitalize">
                            {e.approval}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatEventDate(e.date)} · {e.time}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {e.venue}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {e._count.rsvps} / {e.capacity} RSVPs
                        </span>
                      </div>

                      {e.description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground/80 pt-1">
                          {e.description}
                        </p>
                      )}

                      {tagsList.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2">
                          {tagsList.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </>
  );
}
