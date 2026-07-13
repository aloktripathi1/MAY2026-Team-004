import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, Stat } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Metrics · Admin · Sangam",
  description: "Club activity dashboard.",
};

export default async function MetricsPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fortyNineDaysAgo = new Date(now.getTime() - 49 * 24 * 60 * 60 * 1000);

  const [clubs, newSignups, recentEvents, recentAnnouncements, recentIssues] = await Promise.all([
    prisma.club.findMany({ include: { _count: { select: { memberships: true } } } }),
    prisma.membership.count({ where: { joinedAt: { gte: thirtyDaysAgo } } }),
    prisma.event.findMany({ where: { createdAt: { gte: fortyNineDaysAgo } }, select: { createdAt: true } }),
    prisma.announcement.findMany({ where: { createdAt: { gte: fortyNineDaysAgo } }, select: { createdAt: true } }),
    prisma.issue.findMany({ where: { createdAt: { gte: fortyNineDaysAgo } }, select: { createdAt: true } }),
  ]);

  const byMembers = [...clubs].sort((a, b) => b._count.memberships - a._count.memberships);
  const maxMembers = Math.max(...byMembers.map((c) => c._count.memberships), 1);
  const topClub = byMembers[0];

  // Activity heatmap: real event/announcement/issue creation timestamps bucketed per day, last 49 days.
  const dayBuckets = new Array(49).fill(0);
  for (const item of [...recentEvents, ...recentAnnouncements, ...recentIssues]) {
    const daysAgo = Math.floor((now.getTime() - item.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    if (daysAgo >= 0 && daysAgo < 49) dayBuckets[48 - daysAgo]++;
  }

  return (
    <>
      <PageHeader title={<>The <span className="text-secondary">state</span> of the union.</>} description="Real membership and activity signals across every club." />

      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Total clubs" value={clubs.length} />
        <Stat label="New signups (30d)" value={newSignups} />
        <Stat label="Total members" value={clubs.reduce((sum, c) => sum + c._count.memberships, 0)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <GlassCard className="p-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-mono-label">Members by club</div>
              <div className="text-display text-3xl mt-2">{topClub?.name ?? "-"} leads</div>
            </div>
          </div>
          <div className="space-y-3">
            {byMembers.map(c => (
              <div key={c.id}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{c.name}</span>
                  <span className="text-secondary">{c._count.memberships}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${(c._count.memberships / maxMembers) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="text-mono-label mb-4">Activity heatmap · 7 weeks</div>
          <div className="grid grid-cols-7 gap-1.5">
            {dayBuckets.map((v, i) => {
              const opacity = Math.max(0.06, Math.min(1, v / 5));
              return (
                <div key={i} className="aspect-square rounded-md bg-secondary" style={{ opacity }} title={`${v} events`} />
              );
            })}
          </div>
          <div className="text-mono-label mt-4 flex justify-between !text-[10px]">
            <span>Less</span>
            <span>More</span>
          </div>
        </GlassCard>
      </div>
    </>
  );
}
