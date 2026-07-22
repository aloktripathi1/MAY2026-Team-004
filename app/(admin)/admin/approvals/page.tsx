import type { Metadata } from "next";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
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
              <Avatar name={m.user.name} image={m.user.image} size="md" />
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
