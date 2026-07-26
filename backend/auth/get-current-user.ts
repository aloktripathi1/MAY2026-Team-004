import { prisma } from "@/backend/db/prisma";
import type { SessionMembership } from "@/backend/auth/session-cookies";
import { accessibleAppRoles, homePathForUser, type AppRole } from "@/backend/auth/roles";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  rollNumber: string | null;
  isFaculty: boolean;
  memberships: SessionMembership[];
  /** App shells this user can open (multi-role / multi-club). */
  roles: AppRole[];
  /** Default home path for the highest role. */
  home: string;
};

export type GetCurrentUserResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; code: "UNAUTHENTICATED" | "USER_NOT_FOUND"; message: string };

/**
 * Loads the authenticated user from the database by session cookie user id.
 * Does not fall back to mock/demo personas — callers must treat missing session
 * as unauthenticated. Mock/demo remains in lib/mock-session.ts only.
 */
export async function getCurrentUserById(userId: string): Promise<GetCurrentUserResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { club: true } } },
  });

  if (!user) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: "Session is invalid. Please sign in again.",
    };
  }

  const memberships: SessionMembership[] = user.memberships.map((m) => ({
    clubId: m.clubId,
    clubSlug: m.club.slug,
    clubName: m.club.name,
    role: m.role,
    personaName: user.name,
  }));

  const profile = {
    isFaculty: user.isFaculty,
    memberships,
  };

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      rollNumber: user.rollNumber,
      isFaculty: user.isFaculty,
      memberships,
      roles: accessibleAppRoles(profile),
      home: homePathForUser(profile),
    },
  };
}
