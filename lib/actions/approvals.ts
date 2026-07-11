"use server";

import { revalidatePath } from "next/cache";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";

async function requireAdminForClub(clubId: string) {
  const session = getMockSession();
  if (!session?.user) throw new Error("Not authenticated");
  const isAdmin = session.user.memberships.some((m) => m.clubId === clubId && m.role === "Admin");
  if (!isAdmin) throw new Error("Not authorized for this club");
}

async function requireFaculty() {
  const session = getMockSession();
  if (!session?.user) throw new Error("Not authenticated");
  if (!session.user.isFaculty) throw new Error("Faculty only");
}

export async function setMembershipStatusAction(membershipId: string, status: "Active" | "Inactive") {
  const membership = await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } });
  await requireAdminForClub(membership.clubId);
  await prisma.membership.update({ where: { id: membershipId }, data: { status } });
  revalidatePath("/admin/approvals");
  revalidatePath("/admin/members");
  revalidatePath("/admin");
}

export async function setEventApprovalAction(eventId: string, approval: "approved" | "pending" | "rejected") {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  await requireAdminForClub(event.clubId);
  await prisma.event.update({ where: { id: eventId }, data: { approval } });
  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
  revalidatePath("/faculty/approvals");
}

// Institution-wide — faculty aren't club-scoped, so this bypasses the per-club Admin check
// and requires session.user.isFaculty instead.
export async function facultySetEventApprovalAction(eventId: string, approval: "approved" | "pending" | "rejected") {
  await requireFaculty();
  await prisma.event.update({ where: { id: eventId }, data: { approval } });
  revalidatePath("/faculty/approvals");
  revalidatePath("/admin");
  revalidatePath("/admin/approvals");
}
