import type { Metadata } from "next";
import Link from "next/link";
import { getMockSession } from "@/lib/mock-session";
import { TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, Stat, StatusPill, Btn } from "@/components/ui/primitives";
import { formatEventDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Admin overview · Sangam",
  description: "Club admin unified dashboard.",
};

export default async function AdminDashboard() {
  const session = getMockSession();
  const membership = getPrimaryClubMembership(session!, "Admin");
  const clubId = membership!.clubId;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalMembers, activeMembers, pendingMembers, eventsThisMonth, upcomingEvents, openIssues, announcements] = await Promise.all([
    prisma.membership.count({ where: { clubId } }),
    prisma.membership.count({ where: { clubId, status: "Active" } }),
    prisma.membership.findMany({ where: { clubId, status: "Pending" }, include: { user: true } }),
    prisma.event.count({ where: { clubId, createdAt: { gte: monthStart } } }),
    prisma.event.findMany({ where: { clubId, status: "upcoming" }, orderBy: { date: "asc" }, take: 4, include: { _count: { select: { rsvps: true } } } }),
    prisma.issue.count({ where: { clubId, status: { not: "Resolved" } } }),
    prisma.announcement.findMany({ where: { clubId }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  // Real signal, simplified: RSVPs created in the last 7 days for this club's events, bucketed by weekday.
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentRsvps = await prisma.rsvp.findMany({
    where: { createdAt: { gte: sevenDaysAgo }, event: { clubId } },
    select: { createdAt: true },
  });
  const weeklyAttendance = [0, 0, 0, 0, 0, 0, 0];
  for (const r of recentRsvps) {
    const day = (r.createdAt.getDay() + 6) % 7; // Mon=0..Sun=6
    weeklyAttendance[day]++;
  }
  const maxAttendance = Math.max(...weeklyAttendance, 1);

  return (
    <>
      <PageHeader
        eyebrow="Command center"
        title={<>The whole club, <span className="text-secondary">on one page.</span></>}
        description="Members, events, tasks and issues — no more four-tab juggling."
        actions={<Link href="/admin/announcements"><Btn size="sm">New announcement</Btn></Link>}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Total members" value={totalMembers.toLocaleString()} delta={`${activeMembers} active`} hue="122" />
        <Stat label="Events this month" value={eventsThisMonth} hue="5" />
        <Stat label="Pending approvals" value={pendingMembers.length} hue="45" />
        <Stat label="Open issues" value={openIssues} hue="260" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* Attendance chart */}
          <GlassCard className="p-6">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <div className="text-mono-label">RSVPs, last 7 days</div>
                <div className="text-display mt-2 text-4xl">
                  {recentRsvps.length}
                  {recentRsvps.length > 0 && <span className="text-sm text-success"> <TrendingUp className="inline h-3 w-3" /></span>}
                </div>
              </div>
              <div className="text-mono-label">Last 7 days</div>
            </div>
            {recentRsvps.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-1 text-center">
                <div className="text-sm text-muted-foreground">No RSVPs yet this week.</div>
                <div className="text-xs text-muted-foreground/70">Activity will show up here once members start RSVPing.</div>
              </div>
            ) : (
              <div className="flex h-40 items-end gap-2">
                {weeklyAttendance.map((v, i) => (
                  <div key={i} className="group flex flex-1 flex-col items-center gap-2">
                    <div className="w-full rounded-t-lg bg-secondary transition group-hover:opacity-80"
                         style={{ height: `${(v / maxAttendance) * 100}%` }} />
                    <div className="text-mono-label !text-[9px]">{["M","T","W","T","F","S","S"][i]}</div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Upcoming */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-mono-label">Upcoming events</h2>
              <Link href="/admin/approvals" className="text-xs text-muted-foreground hover:text-foreground">Approvals →</Link>
            </div>
            <div className="night-panel divide-y divide-hairline rounded-2xl">
              {upcomingEvents.length === 0 && <div className="p-4 text-sm text-muted-foreground">No upcoming events.</div>}
              {upcomingEvents.map(e => (
                <div key={e.id} className="flex items-center gap-4 p-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg" style={{ background: e.cover }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{formatEventDate(e.date)} · {e._count.rsvps}/{e.capacity}</div>
                  </div>
                  <StatusPill tone={e.approval === "approved" ? "green" : e.approval === "pending" ? "amber" : "slate"}>
                    {e.approval === "approved" ? "OK" : e.approval === "pending" ? "Pending" : "—"}
                  </StatusPill>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <GlassCard>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-mono-label">Approval queue</div>
              <Link href="/admin/approvals" className="text-xs text-secondary hover:underline">Review →</Link>
            </div>
            <div className="space-y-3">
              {pendingMembers.length === 0 && <div className="text-sm text-muted-foreground">Nothing pending.</div>}
              {pendingMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 border-b border-hairline pb-3 last:border-b-0 last:pb-0">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/15 text-xs font-semibold text-white">
                    {m.user.name.split(" ").map(s => s[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{m.user.name}</div>
                    <div className="text-xs text-muted-foreground">{m.user.rollNumber}</div>
                  </div>
                  <Link href="/admin/approvals" className="text-xs text-secondary hover:underline">Review</Link>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-mono-label">Recent posts</div>
              <Link href="/admin/announcements" className="text-xs text-secondary hover:underline">Compose →</Link>
            </div>
            <div className="space-y-3">
              {announcements.length === 0 && <div className="text-sm text-muted-foreground">No posts yet.</div>}
              {announcements.map(a => (
                <div key={a.id} className="border-b border-hairline pb-3 text-xs last:border-b-0 last:pb-0">
                  <div className="text-mono-label mb-1">{a.createdAt.toLocaleDateString()}</div>
                  <div className="text-sm">{a.title}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );
}
