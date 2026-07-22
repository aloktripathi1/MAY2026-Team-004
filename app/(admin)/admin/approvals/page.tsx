import type { Metadata } from "next";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard } from "@/components/ui/primitives";
import { MembershipApprovalButtons } from "./ApprovalButtons";

export const metadata: Metadata = {
  title: "Approvals · Admin · Sangam",
  description: "Membership approval queue.",
};

export default async function ApprovalsPage() {
  const session = getMockSession();
  const membership = getPrimaryClubMembership(session!, "Admin");
  const clubId = membership!.clubId;

  const pendingMembers = await prisma.membership.findMany({
    where: { clubId, status: "Pending" },
    include: { user: true },
  });

  return (
    <>
      <PageHeader title={<>Membership <span className="text-secondary">Approvals</span></>} description="Review and approve pending membership requests. Event approvals are now handled by faculty coordinators." />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-mono-label">Pending requests · {pendingMembers.length}</h2>
        </div>
        <div className="space-y-2">
          {pendingMembers.length === 0 && <div className="night-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">Inbox zero. Nice.</div>}
          {pendingMembers.map(m => (
            <GlassCard key={m.id} className="flex items-center gap-4 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/15 text-xs font-semibold text-white">
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
    </>
  );
}
