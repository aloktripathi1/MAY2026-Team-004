"use server";

import { revalidatePath } from "next/cache";
import type { Priority } from "@prisma/client";
import { prisma } from "@/backend/db/prisma";
import { getMockSession } from "@/backend/auth/mock-session";
import { getPrimaryClubMembership } from "@/backend/auth/roles";

export type AssignResult = { error?: string; ok?: boolean };

export async function assignIssuesAction(issueIds: string[], assigneeId: string | null): Promise<AssignResult> {
  const session = getMockSession();
  const membership = getPrimaryClubMembership(session!, "Admin");
  if (!membership) return { error: "You must be a club admin to assign issues." };
  if (issueIds.length === 0) return { error: "Select at least one issue." };

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
  const session = getMockSession();
  const membership = getPrimaryClubMembership(session!, "Admin");
  if (!membership) return { error: "You must be a club admin to update issue priority." };

  const validPriorities = ["Low", "Med", "High"];
  if (!validPriorities.includes(priority)) {
    return { error: "Invalid priority value." };
  }

  await prisma.issue.update({
    where: { id: issueId },
    data: { priority: priority as Priority },
  });

  revalidatePath("/admin/issues");
  return { ok: true };
}
