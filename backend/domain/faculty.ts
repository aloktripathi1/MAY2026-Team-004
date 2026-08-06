import { prisma } from "@/backend/db/prisma";

/**
 * Granting and revoking faculty status.
 *
 * Faculty is institution-wide — it approves events for every club — so it is
 * deliberately not self-service. `isFaculty` was previously written only by
 * prisma/seed.ts, which meant a real deployment could never have a faculty
 * reviewer at all.
 *
 * The first faculty account is created out-of-band by scripts/bootstrap-faculty.ts
 * (it needs database access, which is the point: it can't be reached from the
 * web). After that, faculty grant faculty to each other through the app.
 */

export type FacultyChangeResult =
  | { ok: true; user: { id: string; name: string; email: string; isFaculty: boolean }; changed: boolean }
  | { ok: false; code: "USER_NOT_FOUND" | "LAST_FACULTY" | "SELF_REVOKE"; message: string };

export async function listFaculty() {
  return prisma.user.findMany({
    where: { isFaculty: true },
    select: { id: true, name: true, email: true, createdAt: true, emailVerified: true },
    orderBy: { name: "asc" },
  });
}

/** Grants faculty by email. Idempotent: re-granting reports no change. */
export async function grantFaculty(email: string): Promise<FacultyChangeResult> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, name: true, email: true, isFaculty: true },
  });

  if (!user) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: `No Sangam account for ${normalized}. They need to sign up first.`,
    };
  }
  if (user.isFaculty) return { ok: true, user, changed: false };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isFaculty: true },
    select: { id: true, name: true, email: true, isFaculty: true },
  });
  return { ok: true, user: updated, changed: true };
}

/**
 * Revokes faculty. Refuses to remove the last one, and refuses self-revocation:
 * either would leave the institution with no reviewer and no way to appoint one
 * short of database access.
 */
export async function revokeFaculty(userId: string, actingUserId: string): Promise<FacultyChangeResult> {
  if (userId === actingUserId) {
    return {
      ok: false,
      code: "SELF_REVOKE",
      message: "You can't remove your own faculty access. Ask another faculty member to do it.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, isFaculty: true },
  });
  if (!user) return { ok: false, code: "USER_NOT_FOUND", message: "Account not found." };
  if (!user.isFaculty) return { ok: true, user, changed: false };

  const remaining = await prisma.user.count({ where: { isFaculty: true, id: { not: userId } } });
  if (remaining === 0) {
    return {
      ok: false,
      code: "LAST_FACULTY",
      message: "This is the only faculty account. Appoint another before removing this one.",
    };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isFaculty: false },
    select: { id: true, name: true, email: true, isFaculty: true },
  });
  return { ok: true, user: updated, changed: true };
}
