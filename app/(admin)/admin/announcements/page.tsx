import type { Metadata } from "next";
import { getMockSession } from "@/lib/mock-session";
import { Pin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard } from "@/components/ui/primitives";
import { formatTimeAgo } from "@/lib/format";

export const metadata: Metadata = {
  title: "Announcement History · Admin · Sangam",
  description: "View and manage club announcement history.",
};

const priorityColors: Record<string, string> = {
  Low: "bg-blue-500/20 text-blue-300",
  Med: "bg-amber-500/20 text-amber-300",
  High: "bg-red-500/20 text-red-300",
};

export default async function AnnouncementHistoryPage() {
  const session = getMockSession();
  const membership = getPrimaryClubMembership(session!, "Admin");
  const clubId = membership!.clubId;

  const announcements = await prisma.announcement.findMany({
    where: { clubId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <PageHeader title={<>Announcement <span className="text-secondary">History</span></>} description="View all past announcements sent to your club members." />

      <div className="space-y-2">
        {announcements.length === 0 && <div className="text-sm text-muted-foreground">No announcements yet.</div>}
        {announcements.map(a => (
          <GlassCard key={a.id} className="p-4">
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              {a.pinned && <Pin className="h-3 w-3 text-secondary" />}
              {a.audience && a.audience !== "All" && (
                <span className="text-mono-label !text-[10px] text-secondary/80">→ {a.audience}</span>
              )}
              <span className={`text-mono-label !text-[10px] px-2 py-0.5 rounded ${priorityColors[a.priority] || priorityColors.Med}`}>
                {a.priority === "Med" ? "Medium" : a.priority}
              </span>
              <span className="ml-auto text-mono-label !text-[10px] text-muted-foreground/60">{formatTimeAgo(a.createdAt)}</span>
            </div>
            <div className="text-sm font-medium">{a.title}</div>
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</div>
          </GlassCard>
        ))}
      </div>
    </>
  );
}
