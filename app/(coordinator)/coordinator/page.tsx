import type { Metadata } from "next";
import Link from "next/link";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, Stat, StatusPill } from "@/components/ui/primitives";
import { EventThumbnail } from "@/components/ui/EventThumbnail";
import { formatEventDate } from "@/lib/format";
import { NewEventModal } from "@/components/coordinator/NewEventModal";

export const metadata: Metadata = {
  title: "Coordinator · Sangam",
  description: "Event coordinator dashboard.",
};

export default async function CoordinatorHome() {
  const session = getMockSession();
  const membership = getPrimaryClubMembership(session!, "Coordinator");
  const clubId = membership!.clubId;

  const [myEvents, volunteerCount] = await Promise.all([
    prisma.event.findMany({ where: { clubId, status: "upcoming" }, orderBy: { date: "asc" }, take: 3, include: { _count: { select: { countMeIns: true } } } }),
    prisma.membership.count({ where: { clubId, role: { in: ["Volunteer", "Member"] } } }),
  ]);

  const eventIds = myEvents.map(e => e.id);
  const tasks = await prisma.task.findMany({
    where: { eventId: { in: eventIds } },
    include: { event: true },
  });

  return (
    <>
      <PageHeader
        title={<>Run the day, <span className="text-secondary">without the drama.</span></>}
        actions={<NewEventModal />}
      />
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Live events" value={myEvents.length} />
        <Stat label="Volunteers assigned" value={volunteerCount} />
        <Stat label="Tasks open" value={tasks.filter(t => t.status !== "done").length} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-mono-label mb-3">Your events</h2>
          <div className="space-y-2">
            {myEvents.length === 0 && <div className="text-sm text-muted-foreground">No upcoming events.</div>}
            {myEvents.map(e => (
              <Link key={e.id} href={`/coordinator/events/${e.slug}`}>
                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <EventThumbnail title={e.title} cover={e.cover} photo={e.photo} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{e.title}</div>
                      <div className="text-xs text-muted-foreground">{formatEventDate(e.date)} · {e.venue}</div>
                    </div>
                    <StatusPill tone="lime">{e._count.countMeIns}/{e.capacity}</StatusPill>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.min((e._count.countMeIns / e.capacity) * 100, 100)}%` }} />
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-mono-label mb-3">Task board</h2>
          <div className="space-y-2">
            {tasks.length === 0 && <div className="text-sm text-muted-foreground">No tasks yet.</div>}
            {tasks.map(t => (
              <GlassCard key={t.id} className="flex items-center gap-3 p-4">
                <div className={`h-2 w-2 shrink-0 rounded-full ${t.status === "done" ? "bg-success" : t.status === "doing" ? "bg-warning" : "bg-muted-foreground"}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{myEvents.find(e => e.id === t.eventId)?.title ?? "-"}</div>
                </div>
                <StatusPill tone={t.status === "done" ? "green" : t.status === "doing" ? "amber" : "slate"}>{t.status}</StatusPill>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
