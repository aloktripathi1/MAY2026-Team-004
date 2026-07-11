"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getMockSession } from "@/lib/mock-session";
import { getPrimaryClubMembership } from "@/lib/session-helpers";

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
    await prisma.issue.update({ where: { id }, data: { assigneeId: assignee?.id ?? null, assignee } });
  }

  revalidatePath("/admin/issues");
  return { ok: true };
}
