import type { Metadata } from "next";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { formatIssueStatus } from "@/lib/format";
import { IssueForm } from "./IssueForm";
import { StatusFilter } from "./StatusFilter";

export const metadata: Metadata = {
  title: "Issues · Sangam",
  description: "Report and track issues on Sangam.",
};

const VALID_STATUSES = ["Open", "InProgress", "Resolved"];

export default async function IssuesPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = getMockSession();
  const status = VALID_STATUSES.includes(searchParams.status ?? "") ? searchParams.status : "All";

  const myIssues = await prisma.issue.findMany({
    where: { raisedById: session!.user.id, ...(status !== "All" ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { raisedBy: true },
  });

  return (
    <>
      <PageHeader
        title={<>Issues &amp; <span className="text-secondary">tickets.</span></>}
      />
      <div className="mb-6 flex items-center justify-between gap-3">
        <StatusFilter status={status!} />
        <IssueForm />
      </div>
      <div className="space-y-2">
        {myIssues.length === 0 && <div className="text-sm text-muted-foreground">No issues in this view.</div>}
        {myIssues.map(i => (
          <GlassCard key={i.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-mono-label">{i.category}</span>
              </div>
              <div className="truncate text-sm font-medium">{i.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">Raised by {i.raisedBy.name}</div>
              {i.attachments && i.attachments.length > 0 && (
                <div className="mt-2 flex gap-1.5">
                  {i.attachments.map((src: string, idx: number) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={idx} src={src} alt="" className="h-10 w-10 rounded-md border border-white/[0.12] object-cover" />
                  ))}
                </div>
              )}
            </div>
            <StatusPill tone={i.priority === "High" ? "magenta" : i.priority === "Med" ? "amber" : "slate"}>{i.priority}</StatusPill>
            <StatusPill tone={i.status === "Resolved" ? "green" : i.status === "InProgress" ? "amber" : "magenta"}>{formatIssueStatus(i.status)}</StatusPill>
          </GlassCard>
        ))}
      </div>
    </>
  );
}
