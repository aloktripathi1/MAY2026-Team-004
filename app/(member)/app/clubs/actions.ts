"use server";

import { revalidatePath } from "next/cache";
import { getMockSession } from "@/backend/auth/mock-session";
import { prisma } from "@/backend/db/prisma";
import { decideJoinRequestAction } from "@/backend/domain/workflow-rules";

export async function toggleJoinRequestAction(clubId: string) {
  const session = await getMockSession();
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
  }

  revalidatePath("/app/clubs");
  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
}
