import type { Metadata } from "next";
import { getMockSession } from "@/backend/auth/mock-session";
import { Download } from "lucide-react";
import { prisma } from "@/backend/db/prisma";
import { getPrimaryClubMembership } from "@/backend/auth/roles";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, Btn, StatusPill } from "@/components/ui/primitives";
import { TransferAdminForm } from "./TransferAdminForm";

export const metadata: Metadata = {
  title: "Handover · Admin · Sangam",
  description: "Leadership handover and data export.",
};

export default async function HandoverPage() {
  const session = await getMockSession();
  const membership = getPrimaryClubMembership(session!, "Admin");
  const clubId = membership!.clubId;

  const [memberCount, eventCount, candidates] = await Promise.all([
    prisma.membership.count({ where: { clubId } }),
    prisma.event.count({ where: { clubId, status: "past" } }),
    prisma.membership.findMany({
      where: { clubId, role: { not: "Admin" } },
      include: { user: true },
      orderBy: { role: "asc" },
    }),
  ]);

  const steps = [
    { label: "Export member directory", done: true, note: `${memberCount} records · CSV ready` },
    { label: "Freeze past event log", done: true, note: `${eventCount} events archived` },
    { label: "Transfer credentials to incoming head", done: false, note: "Pick a successor below" },
    { label: "Archive announcements", done: false, note: "Pending" },
    { label: "Publish outcome retrospective", done: false, note: "Draft not started" },
  ];

  return (
    <>
      <PageHeader
        title={<>Handover, <span className="text-secondary">without the folklore.</span></>}
        description="One export, five steps. Your successor inherits history, not just vibes."
        actions={<Btn><Download className="h-4 w-4" /> Full data export</Btn>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="text-mono-label mb-3">Checklist · {steps.filter(s => s.done).length} / {steps.length} done</div>
          <div className="night-panel divide-y divide-hairline rounded-2xl">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-4 p-5">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ${s.done ? "bg-secondary text-secondary-foreground ring-secondary/35" : "bg-white/[0.045] text-muted-foreground ring-white/10"}`}>
                  {s.done ? "✓" : i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm ${s.done ? "text-muted-foreground line-through" : "font-medium"}`}>{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-mono-label mb-3">Transfer leadership</div>
          <GlassCard>
            {candidates.length === 0 ? (
              <div className="text-sm text-muted-foreground">No other members in this club yet.</div>
            ) : (
              <TransferAdminForm candidates={candidates.map((c) => ({ membershipId: c.id, name: c.user.name, role: c.role }))} />
            )}
          </GlassCard>
          <GlassCard className="mt-4 border-secondary/25 bg-secondary/[0.08]">
            <StatusPill tone="lime">Verified</StatusPill>
            <div className="mt-3 text-sm">
              Transfer takes effect immediately: your role becomes Coordinator, the successor becomes Admin.
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );
}
