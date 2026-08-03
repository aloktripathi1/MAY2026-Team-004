"use server";

import { revalidatePath } from "next/cache";
import { getMockSession } from "@/backend/auth/mock-session";
import { prisma } from "@/backend/db/prisma";
import { setEventApprovalByFaculty } from "@/backend/domain/events";
import {
  normalizeEventApproval,
  normalizeMembershipStatus,
  requireClubAdminAccess,
  requireFacultyAccess,
} from "@/backend/domain/workflow-rules";

async function requireAdminForClub(clubId: string) {
  const session = await getMockSession();
  if (!session?.user) throw new Error("Not authenticated");
  requireClubAdminAccess(session.user.memberships, clubId);
}

async function requireFaculty() {
  const session = await getMockSession();
  if (!session?.user) throw new Error("Not authenticated");
  requireFacultyAccess(session.user.isFaculty);
}

export async function setMembershipStatusAction(membershipId: string, status: "Active" | "Inactive") {
  const membership = await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } });
  await requireAdminForClub(membership.clubId);
  await prisma.membership.update({ where: { id: membershipId }, data: { status: normalizeMembershipStatus(status) } });
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/members");
  revalidatePath("/admin");
}

export async function setEventApprovalAction(eventId: string, approval: "approved" | "pending" | "rejected") {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  await requireAdminForClub(event.clubId);
  await prisma.event.update({ where: { id: eventId }, data: { approval: normalizeEventApproval(approval) } });
  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
  revalidatePath("/faculty/approvals");
}

// Institution-wide - faculty aren't club-scoped, so this bypasses the per-club Admin check
// and requires session.user.isFaculty instead. Routed through setEventApprovalByFaculty
// (rather than a raw prisma.update) so the registered-participants guard on
// approved -> rejected applies here too, not just to the REST endpoint (#119).
export async function facultySetEventApprovalAction(eventId: string, approval: "approved" | "pending" | "rejected", force = false) {
  await requireFaculty();
  const result = await setEventApprovalByFaculty(true, eventId, approval, force);
  if (!result.ok) throw new Error(result.message);

  revalidatePath("/faculty/approvals");
  revalidatePath("/admin");
  revalidatePath("/admin/approvals");
}
