import Link from "next/link";
import { prisma } from "@/backend/db/prisma";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { formatEventDate, formatWeekday, formatDayNumber } from "@/lib/format";
import { normalizeEventTags } from "@/lib/event-tags";
import { Calendar, MapPin, Users } from "lucide-react";

/**
 * The Coordinator surface's event list — extracted so both the Coordinator's
 * own page and the Admin's native /admin/events page can mount the identical
 * component instead of two copies drifting apart. `basePath` picks which
 * shell's event-detail route each card links to, so an Admin stays in their
 * own shell instead of bouncing to /coordinator on drill-down.
 */
export async function EventsListView({ clubId, basePath = "/coordinator" }: { clubId: string; basePath?: string }) {
  const events = await prisma.event.findMany({
    where: { clubId },
    orderBy: { date: "desc" },
    include: { _count: { select: { countMeIns: true } } },
  });

  return (
    <div className="max-w-3xl space-y-4">
      {events.length === 0 && (
        <GlassCard className="p-8 text-center text-sm text-muted-foreground">
          No events found. Click "New event" above to publish one.
        </GlassCard>
      )}

      {events.map((e) => {
        const tagsList = normalizeEventTags(e.tags);
        return (
          <Link key={e.id} href={`${basePath}/events/${e.slug}`} className="block">
            <GlassCard className="p-5 transition hover:border-white/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.045] text-center">
                    {e.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div>
                        <div className="text-mono-label !text-[8px]">{formatWeekday(e.date)}</div>
                        <div className="text-display -mt-0.5 text-lg text-white">{formatDayNumber(e.date)}</div>
                      </div>
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
                        {e._count.countMeIns} / {e.capacity} counted in
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
  );
}
