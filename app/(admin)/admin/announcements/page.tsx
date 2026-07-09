import type { Metadata } from "next";
import { getMockSession } from "@/lib/mock-session";
import { Pin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard } from "@/components/ui/primitives";
import { formatTimeAgo } from "@/lib/format";
import { AnnouncementForm } from "./AnnouncementForm";

export const metadata: Metadata = {
  title: "Announcements · Admin · Sangam",
  description: "Compose and manage club announcements.",
};

export default async function AnnouncementsPage() {
  const session = getMockSession();
  const membership = getPrimaryClubMembership(session!, "Admin");
  const clubId = membership!.clubId;

  const announcements = await prisma.announcement.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader eyebrow="Broadcast" title={<>Say something <span className="text-display text-primary italic">worth reading.</span></>} description="Only members of your club will see this. Pin the ones that matter." />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <GlassCard className="glass-strong p-6">
          <AnnouncementForm />
        </GlassCard>

        <div>
          <div className="text-mono-label mb-3">Recent</div>
          <div className="space-y-2">
            {announcements.length === 0 && <div className="text-sm text-muted-foreground">No announcements yet.</div>}
            {announcements.map(a => (
              <GlassCard key={a.id} className="p-4">
                <div className="mb-1.5 flex items-center gap-2">
                  {a.pinned && <Pin className="h-3 w-3 text-primary" />}
                  <span className="ml-auto text-mono-label !text-[10px] text-muted-foreground/60">{formatTimeAgo(a.createdAt)}</span>
                </div>
                <div className="text-sm font-medium">{a.title}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
