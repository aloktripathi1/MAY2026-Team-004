import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { formatEventDate } from "@/lib/format";
import { MembershipApprovalButtons, EventApprovalButtons } from "./ApprovalButtons";

export const metadata: Metadata = {
  title: "Approvals · Admin · Sangam",
  description: "Membership and event approval queues.",
};

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);
  const membership = getPrimaryClubMembership(session!, "Admin");
  const clubId = membership!.clubId;

  const [pendingMembers, pendingEvents] = await Promise.all([
    prisma.membership.findMany({ where: { clubId, status: "Pending" }, include: { user: true } }),
    prisma.event.findMany({ where: { clubId, approval: "pending" } }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Queues" title={<>Approvals <span className="text-display text-primary italic">to clear.</span></>} description="Membership requests + events needing sign-off. Handle these first thing every morning." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-mono-label">Membership · {pendingMembers.length}</h2>
          </div>
          <div className="space-y-2">
            {pendingMembers.length === 0 && <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Inbox zero. Nice.</div>}
            {pendingMembers.map(m => (
              <GlassCard key={m.id} className="flex items-center gap-4 p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold bg-primary/15 text-primary">
                  {m.user.name.split(" ").map(s => s[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.user.name}</div>
                  <div className="text-xs text-muted-foreground">{m.user.rollNumber}</div>
                </div>
                <MembershipApprovalButtons membershipId={m.id} />
              </GlassCard>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-mono-label">Events · {pendingEvents.length}</h2>
          </div>
          <div className="space-y-2">
            {pendingEvents.length === 0 && <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Inbox zero. Nice.</div>}
            {pendingEvents.map(e => (
              <GlassCard key={e.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-lg" style={{ background: e.cover }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{formatEventDate(e.date)}</div>
                  </div>
                  <StatusPill tone="amber">Pending</StatusPill>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{e.description}</p>
                <EventApprovalButtons eventId={e.id} />
              </GlassCard>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
