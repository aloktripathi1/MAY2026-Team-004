"use server";

import { revalidatePath } from "next/cache";
import { getAppSession } from "@/backend/auth/app-session";
import { prisma } from "@/backend/db/prisma";
import { getPrimaryClubMembership } from "@/backend/auth/roles";
import { notifyAdminHandover } from "@/backend/email/notifications";

export type TransferState = { error?: string; ok?: boolean };

// Atomically swaps the Admin role: current admin's membership demotes to
// Coordinator, the chosen successor's membership promotes to Admin.
export async function transferAdminAction(_prevState: TransferState, formData: FormData): Promise<TransferState> {
  const session = await getAppSession();
  if (!session?.user) return { error: "Not authenticated" };

  const currentMembership = getPrimaryClubMembership(session, "Admin");
  if (!currentMembership) return { error: "You must be a club admin to transfer this role." };

  const pendingCount = await prisma.membership.count({
    where: { clubId: currentMembership.clubId, status: "Pending" },
  });
  if (pendingCount > 0) {
    return {
      error: `Resolve the ${pendingCount} pending membership request${pendingCount === 1 ? "" : "s"} for this club before handing over admin.`,
    };
  }

  const successorMembershipId = formData.get("successorMembershipId") as string | null;
  if (!successorMembershipId) return { error: "Choose a successor first." };

  const successor = await prisma.membership.findUnique({ where: { id: successorMembershipId } });
  if (!successor || successor.clubId !== currentMembership.clubId) {
    return { error: "Successor must be a member of the same club." };
  }
  if (successor.status !== "Active") {
    return { error: "Successor must be an active member of the club." };
  }

  const currentAdminMembership = await prisma.membership.findUnique({
    where: { userId_clubId: { userId: session.user.id, clubId: currentMembership.clubId } },
  });
  if (!currentAdminMembership) return { error: "Membership record not found." };

  await prisma.$transaction([
    prisma.membership.update({ where: { id: currentAdminMembership.id }, data: { role: "Coordinator" } }),
    prisma.membership.update({ where: { id: successor.id }, data: { role: "Admin" } }),
  ]);

  // Both sides get a confirmation — the incoming admin because their
  // permissions just changed, the outgoing one as a record that it happened.
  await notifyAdminHandover(currentMembership.clubId, session.user.id, successor.userId);

  revalidatePath("/admin");
  revalidatePath("/admin/handover");
  revalidatePath("/admin/members");
  return { ok: true };
}
