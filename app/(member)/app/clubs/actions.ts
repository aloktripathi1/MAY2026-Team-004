"use server";

import { revalidatePath } from "next/cache";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";

export async function toggleJoinRequestAction(clubId: string) {
  const session = getMockSession();
  if (!session?.user) throw new Error("Not authenticated");

  const existing = await prisma.membership.findUnique({
    where: { userId_clubId: { userId: session.user.id, clubId } },
  });

  if (existing?.status === "Pending") {
    await prisma.membership.delete({ where: { id: existing.id } });
  } else if (!existing) {
    const [user, club] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id } }),
      prisma.club.findUnique({ where: { id: clubId } }),
    ]);
    if (!club) throw new Error("Club not found");

    await prisma.membership.create({
      data: {
        userId: session.user.id,
        clubId,
        role: "Member",
        status: "Pending",
        joinedAt: new Date(),
        user,
        club,
      },
    });
  }

  revalidatePath("/app/clubs");
  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
}
