"use server";

import { revalidatePath } from "next/cache";
import type { Priority } from "@prisma/client";
import { prisma } from "@/backend/db/prisma";
import { getMockSession } from "@/backend/auth/mock-session";
import { getPrimaryClubMembership } from "@/backend/auth/roles";

export type AssignResult = { error?: string; ok?: boolean };

// An Admin may only act on issues raised against their own club (or
// club-less/platform issues, clubId null); previously any club Admin could
// reassign or reprioritize any club's issues (see issue #46).
function isAuthorizedForIssue(adminClubIds: Set<string>, issueClubId: string | null): boolean {
  return issueClubId === null || adminClubIds.has(issueClubId);
}

export async function assignIssuesAction(issueIds: string[], assigneeId: string | null): Promise<AssignResult> {
  const session = await getMockSession();
  const membership = getPrimaryClubMembership(session!, "Admin");
  if (!membership) return { error: "You must be a club admin to assign issues." };
  if (issueIds.length === 0) return { error: "Select at least one issue." };

  const adminClubIds = new Set(
    session!.user.memberships.filter((m) => m.role === "Admin").map((m) => m.clubId),
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

export async function updateIssuePriorityAction(issueId: string, priority: string): Promise<AssignResult> {
  const session = await getMockSession();
  const membership = getPrimaryClubMembership(session!, "Admin");
  if (!membership) return { error: "You must be a club admin to update issue priority." };

  const validPriorities = ["Low", "Med", "High"];
  if (!validPriorities.includes(priority)) {
    return { error: "Invalid priority value." };
  }

  const adminClubIds = new Set(
    session!.user.memberships.filter((m) => m.role === "Admin").map((m) => m.clubId),
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
