import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { normalizeEventTags } from "@/lib/event-tags";
import { formatEventDate } from "@/lib/format";
import { FacultyApprovalButtons } from "./FacultyApprovalButtons";

export const metadata: Metadata = {
  title: "Faculty approvals · Sangam",
  description: "Approve or block events needing faculty sign-off.",
};

export default async function FacultyApprovals() {
  const pending = await prisma.event.findMany({
    where: { approval: "pending" },
    include: { club: true },
    orderBy: { date: "asc" },
  });

  return (
    <>
      <PageHeader eyebrow="Sign-off queue" title={<>Events needing <span className="text-display text-primary italic">your nod.</span></>} description="Off-campus travel, sponsored events, and anything with faculty-only approval." />
      <div className="space-y-4">
        {pending.map(e => (
          <GlassCard key={e.id} className="p-6">
            <div className="grid gap-4 md:grid-cols-[120px_1fr_auto]">
              <div className="h-24 rounded-xl" style={{ background: e.cover }} />
              <div className="min-w-0">
                <div className="text-mono-label mb-1">{e.club.name} · {formatEventDate(e.date)}</div>
                <div className="text-lg font-medium">{e.title}</div>
                <div className="mt-2 text-sm text-muted-foreground">{e.description}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {normalizeEventTags(e.tags).map(t => <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground">{t}</span>)}
                  <StatusPill tone="amber">Pending</StatusPill>
                </div>
              </div>
              <FacultyApprovalButtons eventId={e.id} />
            </div>
          </GlassCard>
        ))}
        {pending.length === 0 && <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Nothing to review. Enjoy your afternoon, Professor.</div>}
      </div>
    </>
  );
}
