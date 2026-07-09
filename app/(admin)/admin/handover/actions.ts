"use server";

import { revalidatePath } from "next/cache";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";

export type TransferState = { error?: string; ok?: boolean };

// Atomically swaps the Admin role: current admin's membership demotes to
// Coordinator, the chosen successor's membership promotes to Admin.
export async function transferAdminAction(_prevState: TransferState, formData: FormData): Promise<TransferState> {
  const session = getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  const currentMembership = getPrimaryClubMembership(session, "Admin");
  if (!currentMembership) return { error: "You must be a club admin to transfer this role." };

  const successorMembershipId = formData.get("successorMembershipId") as string | null;
  if (!successorMembershipId) return { error: "Choose a successor first." };

  const successor = await prisma.membership.findUnique({ where: { id: successorMembershipId } });
  if (!successor || successor.clubId !== currentMembership.clubId) {
    return { error: "Successor must be a member of the same club." };
  }

  const currentAdminMembership = await prisma.membership.findUnique({
    where: { userId_clubId: { userId: session.user.id, clubId: currentMembership.clubId } },
  });
  if (!currentAdminMembership) return { error: "Membership record not found." };

  await prisma.$transaction([
    prisma.membership.update({ where: { id: currentAdminMembership.id }, data: { role: "Coordinator" } }),
    prisma.membership.update({ where: { id: successor.id }, data: { role: "Admin" } }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/handover");
  revalidatePath("/admin/members");
  return { ok: true };
}
