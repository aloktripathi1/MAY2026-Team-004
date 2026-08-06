"use server";

import { revalidatePath } from "next/cache";
import type { IssueStatus, Priority } from "@prisma/client";
import { prisma } from "@/backend/db/prisma";
import { getMockSession } from "@/backend/auth/mock-session";
import { getPrimaryClubMembership } from "@/backend/auth/roles";
import { notifyIssueStatusChanged } from "@/backend/email/notifications";

export type AssignResult = { error?: string; ok?: boolean };

// An Admin may only act on issues raised against their own club (or
// club-less/platform issues, clubId null); previously any club Admin could
// reassign or reprioritize any club's issues (see issue #46).
function isAuthorizedForIssue(adminClubIds: Set<string>, issueClubId: string | null): boolean {
  return issueClubId === null || adminClubIds.has(issueClubId);
}

export async function assignIssuesAction(issueIds: string[], assigneeId: string | null): Promise<AssignResult> {
  const session = await getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  const membership = getPrimaryClubMembership(session, "Admin");
  if (!membership) return { error: "You must be a club admin to assign issues." };
  if (issueIds.length === 0) return { error: "Select at least one issue." };

  const adminClubIds = new Set(
    session.user.memberships.filter((m) => m.role === "Admin").map((m) => m.clubId),
  );
  const issues = await prisma.issue.findMany({ where: { id: { in: issueIds } } });
  if (issues.some((issue) => !isAuthorizedForIssue(adminClubIds, issue.clubId))) {
    return { error: "Not authorized for one or more of the selected issues." };
  }

  let assignee = null;
  if (assigneeId) {
    assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee) return { error: "Assignee not found." };
  }

  for (const id of issueIds) {
    await prisma.issue.update({ where: { id }, data: { assigneeId: assignee?.id ?? null } });
  }

  revalidatePath("/admin/issues");
  return { ok: true };
}

/**
 * Moves an issue through Open → In progress → Resolved.
 *
 * The board rendered `status` as a read-only pill and nothing in the app could
 * change it, so the enum's other two values were unreachable — and the person
 * who raised the issue never heard anything back. Added alongside the email
 * notifications (#113), which need a real transition to fire on.
 */
export async function updateIssueStatusAction(issueId: string, status: string): Promise<AssignResult> {
  const session = await getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  const membership = getPrimaryClubMembership(session, "Admin");
  if (!membership) return { error: "You must be a club admin to update issue status." };

  const validStatuses: IssueStatus[] = ["Open", "InProgress", "Resolved"];
  if (!validStatuses.includes(status as IssueStatus)) {
    return { error: "Invalid status value." };
  }

  const adminClubIds = new Set(
    session.user.memberships.filter((m) => m.role === "Admin").map((m) => m.clubId),
  );
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!issue) return { error: "Issue not found." };
  if (!isAuthorizedForIssue(adminClubIds, issue.clubId)) {
    return { error: "Not authorized for this issue." };
  }

  if (issue.status === status) return { ok: true };

  await prisma.issue.update({ where: { id: issueId }, data: { status: status as IssueStatus } });
  await notifyIssueStatusChanged(issueId);

  revalidatePath("/admin/issues");
  revalidatePath("/app/issues");
  revalidatePath("/app");
  return { ok: true };
}

export async function updateIssuePriorityAction(issueId: string, priority: string): Promise<AssignResult> {
  const session = await getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  const membership = getPrimaryClubMembership(session, "Admin");
  if (!membership) return { error: "You must be a club admin to update issue priority." };

  const validPriorities = ["Low", "Med", "High"];
  if (!validPriorities.includes(priority)) {
    return { error: "Invalid priority value." };
  }

  const adminClubIds = new Set(
    session.user.memberships.filter((m) => m.role === "Admin").map((m) => m.clubId),
  );
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!issue) return { error: "Issue not found." };
  if (!isAuthorizedForIssue(adminClubIds, issue.clubId)) {
    return { error: "Not authorized for this issue." };
  }

  await prisma.issue.update({
    where: { id: issueId },
    data: { priority: priority as Priority },
  });

  revalidatePath("/admin/issues");
  return { ok: true };
}
