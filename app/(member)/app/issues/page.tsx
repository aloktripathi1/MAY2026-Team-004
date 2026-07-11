import type { Metadata } from "next";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { IssuesClient } from "./IssuesClient";

export const metadata: Metadata = {
  title: "Issues · Sangam",
  description: "Report and track issues on Sangam.",
};

export default async function IssuesPage() {
  const session = getMockSession();
  const myIssues = await prisma.issue.findMany({
    where: { raisedById: session!.user.id },
    orderBy: { createdAt: "desc" },
    include: { raisedBy: true },
  });

  const issues = myIssues.map((i) => ({
    id: i.id,
    title: i.title,
    category: i.category,
    priority: i.priority,
    status: i.status,
    raisedByName: i.raisedBy.name,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Support"
        title={<>Issues &amp; <span className="text-secondary">tickets.</span></>}
      />
      <IssuesClient issues={issues} />
    </>
  );
}
