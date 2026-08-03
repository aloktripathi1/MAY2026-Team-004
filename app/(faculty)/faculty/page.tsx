import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/backend/db/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, Stat, StatusPill } from "@/components/ui/primitives";
import { formatEventDate, pluralize } from "@/lib/format";

export const metadata: Metadata = {
  title: "Faculty oversight · Sangam",
  description: "Faculty mentor read-only dashboard.",
};

export default async function FacultyHome() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [clubs, eventsThisMonth, pendingApprovals, totalEvents, recentEvents] = await Promise.all([
    prisma.club.findMany({
      take: 6,
      orderBy: { name: "asc" },
      include: { _count: { select: { memberships: true } }, events: { orderBy: { date: "desc" }, take: 1 } },
    }),
    prisma.event.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.event.count({ where: { approval: "pending" } }),
    prisma.event.count(),
    prisma.event.findMany({ orderBy: { date: "desc" }, take: 5, include: { club: true, _count: { select: { countMeIns: true } } } }),
  ]);

  // Share of events that have cleared the approval queue (approved or didn't need one),
  // rather than a fabricated number — 100% when there are no events yet.
  const compliance = totalEvents === 0 ? 100 : Math.round(((totalEvents - pendingApprovals) / totalEvents) * 100);

  return (
    <>
      <PageHeader title={<>Club activity, <span className="text-secondary">at a glance.</span></>} description="Signals. Not surveillance." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Clubs monitored" value={clubs.length} />
        <Stat label="Events this month" value={eventsThisMonth} />
        <Stat label="Pending approvals" value={pendingApprovals} delta={pendingApprovals > 0 ? "Needs you" : undefined} />
        <Stat label="Compliance" value={`${compliance}%`} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="text-mono-label mb-3">Clubs under mentorship</div>
          <div className="space-y-2">
            {clubs.map(c => (
              <Link key={c.id} href={`/faculty/clubs/${c.id}`} className="block">
                <GlassCard className="flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
                       style={{ background: `oklch(0.72 0.18 ${c.hue} / 15%)`, color: `oklch(0.9 0.2 ${c.hue})` }}>{c.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.events[0] ? `Last event ${formatEventDate(c.events[0].date)}` : "No events yet"} · {c._count.memberships} {pluralize(c._count.memberships, "member")}
                    </div>
                  </div>
                  <StatusPill tone={c.active ? "green" : "amber"}>{c.active ? "Healthy" : "Quiet"}</StatusPill>
                </GlassCard>
              </Link>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="text-mono-label">Recent event outcomes</div>
            <Link href="/faculty/approvals" className="text-xs text-secondary hover:underline">Review approvals →</Link>
          </div>
          <div className="night-panel divide-y divide-hairline rounded-2xl">
            {recentEvents.map(e => (
              <div key={e.id} className="p-4">
                <div className="text-mono-label mb-1">{e.club.name}</div>
                <div className="text-sm">{e.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{formatEventDate(e.date)} · {e._count.countMeIns} attendees</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
