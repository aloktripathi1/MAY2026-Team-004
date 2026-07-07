import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { Download } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
import { PageHeader } from "@/components/shell/AppShell";
import { StatusPill, Btn } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Transparency · Admin · Sangam",
  description: "Public outcome log for every event.",
};

export default async function TransparencyPage() {
  const session = await getServerSession(authOptions);
  const membership = getPrimaryClubMembership(session!, "Admin");
  const clubId = membership!.clubId;

  const log = await prisma.transparencyLogEntry.findMany({
    where: { clubId },
    orderBy: { date: "desc" },
  });

  return (
    <>
      <PageHeader
        eyebrow="Public ledger"
        title={<>Every event, <span className="text-display text-primary italic">accounted for.</span></>}
        description="Outcome, spend, attendance. Auto-logged. Members and faculty can read this."
        actions={<Btn size="sm" variant="outline"><Download className="h-4 w-4" /> Export CSV</Btn>}
      />
      <div className="glass-strong overflow-hidden rounded-2xl">
        {log.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No entries logged yet.</div>}
        {log.map((row, i) => (
          <div key={row.id} className="grid grid-cols-[1fr_120px_100px_120px] items-center gap-4 border-b border-hairline px-6 py-5 last:border-b-0 md:grid-cols-[2fr_140px_140px_140px_120px]">
            <div className="min-w-0">
              <div className="text-mono-label mb-1">{row.date}</div>
              <div className="text-sm font-medium">{row.eventName}</div>
              <div className="mt-1 text-xs text-muted-foreground">{row.outcome}</div>
            </div>
            <div className="hidden md:block">
              <div className="text-mono-label">Attendance</div>
              <div className="text-sm">{row.attendance}</div>
            </div>
            <div>
              <div className="text-mono-label">Spend</div>
              <div className="text-sm">{row.spend}</div>
            </div>
            <div>
              <div className="text-mono-label">Status</div>
              <StatusPill tone={i === 0 ? "lime" : "slate"}>{i === 0 ? "Flagship" : "Logged"}</StatusPill>
            </div>
            <span className="text-xs text-muted-foreground">—</span>
          </div>
        ))}
      </div>
    </>
  );
}
