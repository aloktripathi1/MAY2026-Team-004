import type { ClubRole } from "@prisma/client";
import type { Metadata } from "next";
import { getMockSession } from "@/backend/auth/mock-session";
import { prisma } from "@/backend/db/prisma";
import { getPrimaryClubMembership } from "@/backend/auth/roles";
import { PageHeader } from "@/components/shell/AppShell";
import { formatTimeAgo } from "@/lib/format";
import { IssuesBoard, type IssueRow, type AssignableMember } from "./IssuesBoard";

export const metadata: Metadata = {
  title: "Issues · Admin · Sangam",
  description: "Every ticket raised across the club, in one queue.",
};

const STAFF_ROLES: ClubRole[] = ["Coordinator", "Volunteer", "Admin"];

export default async function AdminIssuesPage() {
  const session = await getMockSession();
  const membership = getPrimaryClubMembership(session!, "Admin");
  const clubId = membership!.clubId;

  const club = await prisma.club.findUnique({ where: { id: clubId } });

  const [issues, staff] = await Promise.all([
    prisma.issue.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      include: { raisedBy: true, assignee: true },
    }),
    prisma.membership.findMany({
      where: { clubId, role: { in: STAFF_ROLES } },
      include: { user: true },
    }),
  ]);

  const rows: IssueRow[] = issues.map((issue, index) => ({
    id: issue.id,
    ticket: `SG-${200 + index}`,
    title: issue.title,
    category: issue.category,
    priority: issue.priority,
    status: issue.status,
    raisedBy: issue.raisedBy?.name ?? "Unknown",
    timeAgo: formatTimeAgo(issue.createdAt),
    assigneeId: issue.assignee?.id ?? null,
    assigneeName: issue.assignee?.name ?? null,
  }));

  const assignable: AssignableMember[] = staff.map((m) => ({ id: m.user.id, name: m.user.name }));

  return (
    <>
      <PageHeader
        title={<>Every ticket, <span className="text-secondary">one queue.</span></>}
        description={`Every ticket raised across ${club?.name ?? "your club"}, in one queue.`}
      />
      <IssuesBoard issues={rows} assignable={assignable} />
    </>
  );
}
