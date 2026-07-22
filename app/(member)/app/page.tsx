import type { Metadata } from "next";
import Link from "next/link";
import { getMockSession } from "@/lib/mock-session";
import { CalendarClock, ArrowUpRight, Pin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, Stat, StatusPill, Btn } from "@/components/ui/primitives";
import { formatWeekday, formatDayNumber, formatIssueStatus, formatTimeAgo } from "@/lib/format";

export const metadata: Metadata = {
  title: "Dashboard · Sangam",
  description: "Your personal Sangam dashboard.",
};

export default async function MemberDashboard() {
  const session = getMockSession();
  const userId = session!.user.id;
  const memberships = session!.user.memberships;

  const [upcoming, myIssues, announcements] = await Promise.all([
    prisma.event.findMany({ where: { status: "upcoming" }, orderBy: { date: "asc" }, take: 4, include: { club: true, _count: { select: { countMeIns: true } } } }),
    prisma.issue.findMany({ where: { raisedById: userId }, orderBy: { createdAt: "desc" } }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 4, include: { club: true } }),
  ]);

  const openTaskCount = await prisma.task.count({ where: { assigneeId: userId, status: { not: "done" } } });

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (session!.user.name ?? "there").split(" ")[0];

  return (
    <>
      <PageHeader
        title={<>{greeting}, <span className="text-secondary">{firstName}.</span></>}
        description="Here's what's on this week across the clubs you belong to."
        actions={<Link href="/app/events"><Btn variant="outline" size="sm">This week →</Btn></Link>}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Clubs joined" value={memberships.length} />
        <Stat label="Upcoming events" value={upcoming.length} />
        <Stat label="Open tasks" value={openTaskCount} />
        <Stat label="Membership" value="Active" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Left column */}
        <section className="space-y-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-mono-label">Your week</h2>
              <Link href="/app/events" className="text-xs text-muted-foreground hover:text-foreground">See all →</Link>
            </div>
            <div className="space-y-4">
              {upcoming.map(e => (
                <Link key={e.id} href={`/app/events/${e.slug}`} className="block">
                  <GlassCard className="group flex items-center gap-5 p-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-center" style={{ background: e.cover }}>
                      <div className="text-mono-label !text-[9px] text-white/80">{formatWeekday(e.date)}</div>
                      <div className="text-display -mt-1 text-2xl text-white">{formatDayNumber(e.date)}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-mono-label mb-1">{e.club.name}</div>
                      <div className="truncate text-base font-medium">{e.title}</div>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {e.time}</span>
                        <span>·</span><span>{e.venue}</span>
                      </div>
                    </div>
                    <div className="hidden text-right sm:block">
                      <div className="text-mono-label">Going</div>
                      <div className="text-display text-2xl">{e._count.countMeIns}</div>
                    </div>
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-secondary" />
                  </GlassCard>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-mono-label">My issues</h2>
              <Link href="/app/issues" className="text-xs text-muted-foreground hover:text-foreground">Manage →</Link>
            </div>
            <div className="night-panel rounded-2xl">
              {myIssues.length === 0 && <div className="p-4 text-sm text-muted-foreground">No issues raised.</div>}
              {myIssues.map(i => (
                <div key={i.id} className="flex items-center gap-3 border-b border-hairline p-3 last:border-b-0">
                  <div className="flex-1 truncate text-sm">{i.title}</div>
                  <StatusPill tone={i.status === "Resolved" ? "green" : i.status === "InProgress" ? "amber" : "magenta"}>{formatIssueStatus(i.status)}</StatusPill>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right column */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-mono-label">Announcements</h2>
            <span className="text-mono-label">{announcements.length} new</span>
          </div>
          <div className="night-panel divide-y divide-hairline rounded-2xl">
            {announcements.map(a => (
              <div key={a.id} className="p-4">
                <div className="mb-1.5 flex items-center gap-2">
                  {a.pinned && <Pin className="h-3 w-3 text-secondary" />}
                  <span className="text-mono-label">{a.club.name}</span>
                  <span className="text-mono-label !normal-case !tracking-normal !text-[10px] text-muted-foreground/60">· {formatTimeAgo(a.createdAt)}</span>
                </div>
                <div className="text-sm font-medium leading-snug">{a.title}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
