import { Prisma } from "@prisma/client";
import { prisma } from "@/backend/db/prisma";
import type { SessionMembership } from "@/backend/auth/session-cookies";
import { normalizeMembershipStatus, requireClubAdminAccess } from "@/backend/domain/workflow-rules";

const ROLES = ["Member", "Volunteer", "Coordinator", "Admin"] as const;

export async function listClubMembers(clubId: string) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return { ok: false, code: "CLUB_NOT_FOUND", message: "Club not found." } as const;

  const memberships = await prisma.membership.findMany({
    where: { clubId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  return {
    ok: true,
    members: memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      rollNumber: m.user.rollNumber,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
    })),
  } as const;
}

export async function applyToJoinClub(userId: string, clubId: string) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return { ok: false, code: "CLUB_NOT_FOUND", message: "Club not found." } as const;

  const alreadyMember = {
    ok: false,
    code: "ALREADY_MEMBER",
    message: "Already a member of, or already applied to, this club.",
  } as const;

  const existing = await prisma.membership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (existing) return alreadyMember;

  try {
    const membership = await prisma.membership.create({
      data: { userId, clubId, role: "Member", status: "Pending" },
    });
    return { ok: true, membership } as const;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return alreadyMember;
    }
    throw error;
  }
}

export async function updateMembershipStatus(
  actorMemberships: SessionMembership[],
  membershipId: string,
  status: "Active" | "Inactive" | "Pending",
) {
  const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!membership) {
    return { ok: false, code: "MEMBERSHIP_NOT_FOUND", message: "Membership not found." } as const;
  }

  try {
    requireClubAdminAccess(actorMemberships, membership.clubId);
  } catch {
    return { ok: false, code: "FORBIDDEN", message: "Not authorized for this club." } as const;
  }

  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: { status: normalizeMembershipStatus(status) },
  });
  return { ok: true, membership: updated } as const;
}

export type BulkImportRow = { name: string; roll: string; email: string; role?: string };

export async function bulkImportMembers(clubId: string, rows: BulkImportRow[]) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return { ok: false, code: "CLUB_NOT_FOUND", message: "Club not found." } as const;

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.name?.trim() || !row.roll?.trim() || !row.email?.trim()) {
      skipped += 1;
      continue;
    }
    const role = ROLES.find((r) => r.toLowerCase() === (row.role ?? "").toLowerCase()) ?? "Member";

    let user = await prisma.user.findUnique({ where: { rollNumber: row.roll } });
    if (!user) {
      await prisma.user.createMany({
        data: [
          {
            email: row.email,
            name: row.name,
            rollNumber: row.roll,
            hashedPassword: "",
            interests: "[]",
          },
        ],
        skipDuplicates: true,
      });
      user = await prisma.user.findUnique({ where: { rollNumber: row.roll } });
      if (!user) {
        // The insert was skipped because this email belongs to another roll.
        skipped += 1;
        continue;
      }
    }

    const created = await prisma.membership.createMany({
      data: [{ userId: user.id, clubId, role, status: "Active" }],
      skipDuplicates: true,
    });
    if (created.count === 0) {
      skipped += 1;
      continue;
    }

    imported += 1;
  }

  return { ok: true, imported, skipped } as const;
}

export async function saveOnboardingInterests(userId: string, interests: string[]) {
  await prisma.user.update({
    where: { id: userId },
    data: { interests: JSON.stringify(interests) },
  });
  return { ok: true } as const;
}
