import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { formatIssueStatus } from "@/lib/format";
import { IssueForm } from "./IssueForm";

export const metadata: Metadata = {
  title: "Issues · Sangam",
  description: "Report and track issues on Sangam.",
};

export default async function IssuesPage() {
  const session = await getServerSession(authOptions);
  const myIssues = await prisma.issue.findMany({
    where: { raisedById: session!.user.id },
    orderBy: { createdAt: "desc" },
    include: { raisedBy: true },
  });

  return (
    <>
      <PageHeader
        eyebrow="Support"
        title={<>Issues &amp; <span className="text-display text-primary italic">tickets.</span></>}
      />
      <IssueForm />
      <div className="space-y-2">
        {myIssues.length === 0 && <div className="text-sm text-muted-foreground">No issues raised yet.</div>}
        {myIssues.map(i => (
          <GlassCard key={i.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-mono-label">{i.category}</span>
              </div>
              <div className="truncate text-sm font-medium">{i.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">Raised by {i.raisedBy.name}</div>
            </div>
            <StatusPill tone={i.priority === "High" ? "magenta" : i.priority === "Med" ? "amber" : "slate"}>{i.priority}</StatusPill>
            <StatusPill tone={i.status === "Resolved" ? "green" : i.status === "InProgress" ? "amber" : "magenta"}>{formatIssueStatus(i.status)}</StatusPill>
          </GlassCard>
        ))}
      </div>
    </>
  );
}
