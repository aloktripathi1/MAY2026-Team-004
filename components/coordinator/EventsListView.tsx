import Link from "next/link";
import { prisma } from "@/backend/db/prisma";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { EventThumbnail } from "@/components/ui/EventThumbnail";
import { formatEventDate, formatWeekday, formatDayNumber } from "@/lib/format";
import { normalizeEventTags } from "@/lib/event-tags";
import { cn } from "@/lib/utils";
import { Calendar, MapPin, Users } from "lucide-react";

/**
 * The Coordinator surface's event list — extracted so both the Coordinator's
 * own page and the Admin's native /admin/events page can mount the identical
 * component instead of two copies drifting apart. `basePath` picks which
 * shell's event-detail route each card links to, so an Admin stays in their
 * own shell instead of bouncing to /coordinator on drill-down. `layout`
 * switches the presentation only — same query, same data, same links —
 * "grid" is the YouTube-style card grid used by the Admin events page,
 * "list" (default) keeps the Coordinator surface's original row layout.
 */
export async function EventsListView({
  clubId,
  basePath = "/coordinator",
  layout = "list",
}: {
  clubId: string;
  basePath?: string;
  layout?: "list" | "grid";
}) {
  const events = await prisma.event.findMany({
    where: { clubId },
    orderBy: { date: "desc" },
    include: { _count: { select: { countMeIns: true } } },
  });

  if (events.length === 0) {
    return (
      <GlassCard className={cn("max-w-3xl p-8 text-center text-sm text-muted-foreground", layout === "grid" && "mx-auto")}>
        No events found. Click "New event" above to publish one.
      </GlassCard>
    );
  }

  if (layout === "grid") {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => {
          const tagsList = normalizeEventTags(e.tags);
          return (
            <Link key={e.id} href={`${basePath}/events/${e.slug}`} className="group block h-full">
              <GlassCard className="flex h-full flex-col overflow-hidden p-0">
                <div className="relative h-40 w-full shrink-0 overflow-hidden">
                  <div className="h-full w-full transition duration-500 ease-out group-hover:scale-105">
                    <EventThumbnail title={e.title} cover={e.cover} photo={e.photo} size="hero" className="rounded-none" />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />

                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    <StatusPill tone={e.status === "live" ? "green" : e.status === "upcoming" ? "amber" : "slate"}>
                      {e.status}
                    </StatusPill>
                    {e.approval && (
                      <span className="rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-medium capitalize text-white backdrop-blur">
                        {e.approval}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2.5 p-5">
                  <h3 className="line-clamp-2 text-base font-semibold leading-snug text-white transition group-hover:text-secondary">
                    {e.title}
                  </h3>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {formatEventDate(e.date)} · {e.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{e.venue}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {e._count.countMeIns} / {e.capacity} counted in
                      </span>
                    </div>
                  </div>

                  {e.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground/80">{e.description}</p>
                  )}

                  {tagsList.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-1 pt-1">
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
              </GlassCard>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
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
