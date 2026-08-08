"use server";

import { revalidatePath } from "next/cache";
import { getAppSession } from "@/backend/auth/app-session";
import { prisma } from "@/backend/db/prisma";
import { decideJoinRequestAction } from "@/backend/domain/workflow-rules";
import { notifyMembershipApplied } from "@/backend/email/notifications";

export async function toggleJoinRequestAction(clubId: string) {
  const session = await getAppSession();
  if (!session?.user) throw new Error("Not authenticated");

  const existing = await prisma.membership.findUnique({
    where: { userId_clubId: { userId: session.user.id, clubId } },
  });

  const action = decideJoinRequestAction(existing?.status);

  if (action === "withdraw") {
    await prisma.membership.delete({ where: { id: existing!.id } });
  } else if (action === "create") {
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new Error("Club not found");

    await prisma.membership.create({
      data: {
        userId: session.user.id,
        clubId,
        role: "Member",
        status: "Pending",
        joinedAt: new Date(),
      },
    });

    // Confirms to the applicant and puts the request in front of the club's
    // admins, same as the REST path in backend/domain/membership.ts.
    await notifyMembershipApplied(session.user.id, clubId);
  }

  revalidatePath("/app/clubs");
  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
}
