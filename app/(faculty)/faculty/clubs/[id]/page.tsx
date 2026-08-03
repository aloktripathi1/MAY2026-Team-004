import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/backend/db/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { EventThumbnail } from "@/components/ui/EventThumbnail";
import { GlassCard, Stat, StatusPill } from "@/components/ui/primitives";
import { formatEventDate, formatTimeAgo, pluralize } from "@/lib/format";

async function getClub(id: string) {
  return prisma.club.findUnique({ where: { id } });
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const club = await getClub(params.id);
  return {
    title: club ? `${club.name} · Faculty · Sangam` : "Club · Sangam",
    description: club?.tagline ?? "Club overview on Sangam.",
  };
}

type ActivityItem = { label: string; context: string; at: Date };

/**
 * Read-only club drill-down for faculty (#124) — previously faculty could
 * only see an aggregate club list or the approval queue, with no way to see
 * one club's actual roster, upcoming events, and recent activity in one place.
 */
export default async function FacultyClubDetail({ params }: { params: { id: string } }) {
  const club = await getClub(params.id);
  if (!club) notFound();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [members, upcomingEvents, recentIssues, recentAnnouncements] = await Promise.all([
    prisma.membership.findMany({
      where: { clubId: club.id, status: "Active" },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.event.findMany({
      where: { clubId: club.id, status: { in: ["upcoming", "live"] } },
      orderBy: { date: "asc" },
      take: 5,
      include: { _count: { select: { countMeIns: true } } },
    }),
    prisma.issue.findMany({ where: { clubId: club.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.announcement.findMany({ where: { clubId: club.id }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  const openIssuesCount = await prisma.issue.count({ where: { clubId: club.id, status: { not: "Resolved" } } });

  const activity: ActivityItem[] = [
    ...recentIssues.map((i) => ({
      label: i.status === "Resolved" ? "Issue resolved" : i.status === "InProgress" ? "Issue moved to review" : "New issue raised",
      context: i.title,
      at: i.createdAt,
    })),
    ...recentAnnouncements.map((a) => ({ label: "Announcement posted", context: a.title, at: a.createdAt })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5);

  return (
    <>
      <Link href="/faculty/club-activity" className="text-mono-label mb-6 inline-flex items-center gap-1.5 hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to club activity
      </Link>

      <PageHeader
        title={<>{club.name}<span className="text-secondary">.</span></>}
        description={club.tagline ?? "Club overview."}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Active members" value={members.length} />
        <Stat label="Upcoming events" value={upcomingEvents.length} />
        <Stat label="Open issues" value={openIssuesCount} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <div>
            <div className="mb-4 text-mono-label">Upcoming events</div>
            <div className="night-panel divide-y divide-hairline rounded-2xl">
              {upcomingEvents.length === 0 && <div className="p-4 text-sm text-muted-foreground">No upcoming events.</div>}
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-4 p-4">
                  <EventThumbnail title={e.title} cover={e.cover} photo={e.photo} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatEventDate(e.date)} · {e._count.countMeIns}/{e.capacity}
                    </div>
                  </div>
                  <StatusPill tone={e.approval === "approved" ? "green" : e.approval === "pending" ? "amber" : e.approval === "rejected" ? "magenta" : "slate"}>
                    {e.approval === "approved" ? "OK" : e.approval === "pending" ? "Pending" : e.approval === "rejected" ? "Rejected" : "-"}
                  </StatusPill>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 text-mono-label">Members ({members.length})</div>
            <div className="night-panel divide-y divide-hairline rounded-2xl">
              {members.length === 0 && <div className="p-4 text-sm text-muted-foreground">No active members yet.</div>}
              {members.slice(0, 10).map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-4">
                  <Avatar name={m.user.name} image={m.user.image} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{m.user.name}</div>
                    <div className="text-xs text-muted-foreground">{m.role} · joined {formatTimeAgo(m.joinedAt)}</div>
                  </div>
                </div>
              ))}
              {members.length > 10 && (
                <div className="p-4 text-xs text-muted-foreground">+{members.length - 10} more {pluralize(members.length - 10, "member")}</div>
              )}
            </div>
          </div>
        </div>

        <GlassCard className="min-w-0">
          <div className="mb-4 text-mono-label">Recent activity</div>
          <div className="space-y-3">
            {activity.length === 0 && <div className="text-sm text-muted-foreground">No recent activity.</div>}
            {activity.map((item, index) => (
              <div key={index} className="border-b border-hairline pb-3 text-xs last:border-b-0 last:pb-0">
                <div className="text-sm text-white">{item.label}</div>
                <div className="mt-1 text-muted-foreground">{item.context} · {formatTimeAgo(item.at)}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </>
  );
}
