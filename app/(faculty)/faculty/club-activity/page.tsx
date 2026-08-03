import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/backend/db/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { formatTimeAgo, pluralize } from "@/lib/format";

export const metadata: Metadata = {
  title: "Club activity · Sangam",
  description: "Engagement signals across every club.",
};

function engagementStatus(daysSinceLastActivity: number | null): { label: "Active" | "Steady" | "At risk"; tone: "green" | "amber" | "magenta" } {
  if (daysSinceLastActivity === null || daysSinceLastActivity > 21) return { label: "At risk", tone: "magenta" };
  if (daysSinceLastActivity <= 7) return { label: "Active", tone: "green" };
  return { label: "Steady", tone: "amber" };
}

export default async function ClubActivityPage() {
  const now = new Date();
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const clubs = await prisma.club.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { memberships: true } },
      events: { orderBy: { date: "desc" }, take: 1 },
    },
  });

  const rows = await Promise.all(
    clubs.map(async (c) => {
      const newMembers30d = await prisma.membership.count({ where: { clubId: c.id, status: "Active", joinedAt: { gte: monthStart } } });
      const lastEventDate = c.events[0]?.date ?? null;
      const daysSinceLastActivity = lastEventDate ? Math.floor((now.getTime() - lastEventDate.getTime()) / (24 * 60 * 60 * 1000)) : null;
      const engagement = engagementStatus(daysSinceLastActivity);
      return { club: c, newMembers30d, lastEventDate, engagement };
    }),
  );

  // Highest engagement first: active clubs with the most recent activity lead the list.
  rows.sort((a, b) => (a.lastEventDate?.getTime() ?? 0) < (b.lastEventDate?.getTime() ?? 0) ? 1 : -1);

  return (
    <>
      <PageHeader
        title={<>Club <span className="text-secondary">activity.</span></>}
        description="Engagement signals across societies - spot who's thriving and who needs a nudge."
      />
      <div className="space-y-2">
        {rows.map(({ club: c, newMembers30d, engagement }) => (
          <Link key={c.id} href={`/faculty/clubs/${c.id}`} className="block">
            <GlassCard className="flex flex-wrap items-center gap-4 p-4">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-semibold"
                style={{ background: `oklch(0.72 0.14 ${c.hue} / 18%)`, color: `oklch(0.9 0.1 ${c.hue})` }}
              >
                {c.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c._count.memberships} {pluralize(c._count.memberships, "member")}</div>
              </div>
              <div className="text-right">
                <div className={`font-mono text-sm font-semibold ${newMembers30d > 0 ? "text-success" : "text-muted-foreground"}`}>
                  {newMembers30d > 0 ? `+${newMembers30d}` : "±0"}
                </div>
                <div className="text-mono-label !text-[9px]">30d</div>
              </div>
              <StatusPill tone={engagement.tone}>{engagement.label}</StatusPill>
              <div className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                {c.events[0] ? formatTimeAgo(c.events[0].date) : "No activity"}
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </>
  );
}
