"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/backend/db/prisma";
import type { SessionMembership } from "@/backend/auth/session-cookies";
import { requireClubAdminAccess } from "@/backend/domain/workflow-rules";
import { notifyRolePromotion, notifyRolePromotionAccepted } from "@/backend/email/notifications";

export type RolePromotionRequest = {
  id: string;
  memberId: string;
  targetRole: "EventCoordinator";
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  respondedAt?: Date;
};

export async function promoteToEventCoordinator(
  actorMemberships: SessionMembership[],
  memberId: string,
  clubId: string,
) {
  const membership = await prisma.membership.findUnique({
    where: { id: memberId },
  });

  if (!membership || membership.clubId !== clubId) {
    return {
      ok: false,
      code: "NOT_FOUND" as const,
      message: "Member not found in this club.",
    };
  }

  try {
    requireClubAdminAccess(actorMemberships, clubId);
  } catch {
    return {
      ok: false,
      code: "FORBIDDEN" as const,
      message: "Only admins can promote members.",
    };
  }

  if (membership.role === "EventCoordinator" || membership.role === "Admin") {
    return {
      ok: false,
      code: "ALREADY_COORDINATOR" as const,
      message: "This member is already a coordinator or admin.",
    };
  }

  if (membership.status !== "Active") {
    return {
      ok: false,
      code: "NOT_ACTIVE" as const,
      message: "Only active members can be promoted.",
    };
  }

  await prisma.membership.update({
    where: { id: memberId },
    data: { role: "EventCoordinator" },
  });

  await notifyRolePromotion(membership.userId, clubId, "EventCoordinator");

  revalidatePath("/admin/members");
  return { ok: true, message: "Member promoted to Event Coordinator" } as const;
}

export async function promoteToCoordinator(
  actorMemberships: SessionMembership[],
  memberId: string,
  clubId: string,
) {
  const membership = await prisma.membership.findUnique({
    where: { id: memberId },
  });

  if (!membership || membership.clubId !== clubId) {
    return {
      ok: false,
      code: "NOT_FOUND" as const,
      message: "Member not found in this club.",
    };
  }

  try {
    requireClubAdminAccess(actorMemberships, clubId);
  } catch {
    return {
      ok: false,
      code: "FORBIDDEN" as const,
      message: "Only admins can promote members.",
    };
  }

  if (membership.role === "Coordinator" || membership.role === "Admin") {
    return {
      ok: false,
      code: "ALREADY_COORDINATOR" as const,
      message: "This member is already a coordinator or admin.",
    };
  }

  if (membership.status !== "Active") {
    return {
      ok: false,
      code: "NOT_ACTIVE" as const,
      message: "Only active members can be promoted.",
    };
  }

  await prisma.membership.update({
    where: { id: memberId },
    data: { role: "Coordinator" },
  });

  await notifyRolePromotion(membership.userId, clubId, "Coordinator");

  revalidatePath("/admin/members");
  return { ok: true, message: "Member promoted to Coordinator" } as const;
}
