import bcrypt from "bcrypt";
import { prisma } from "@/backend/db/prisma";
import type { SessionMembership } from "@/backend/auth/session-cookies";

/**
 * Precomputed bcrypt hash used when no user/password exists so compare timing
 * stays similar (mitigates user-enumeration via response timing).
 * Hash of a fixed dummy string; never a valid login path.
 */
const DUMMY_PASSWORD_HASH =
  "$2b$10$vOKqK4J68kPHKScoEBXauOWakkKvcF26v9jT5aP2kMBWyCON2XAWi";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  rollNumber: string | null;
  isFaculty: boolean;
  memberships: SessionMembership[];
};

export type AuthenticateResult =
  | { ok: true; user: AuthenticatedUser }
  | {
      ok: false;
      /** Specific codes for the form UI; API maps all to INVALID_CREDENTIALS. */
      code: "USER_NOT_FOUND" | "NO_PASSWORD" | "BAD_PASSWORD";
      message: string;
    };

/**
 * Verifies institutional credentials and loads memberships for the session.
 * Does not set cookies — callers (REST route or form action) own session side effects.
 */
export async function authenticateUser(email: string, password: string): Promise<AuthenticateResult> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { club: true } } },
  });

  const hashToCompare =
    user?.hashedPassword && user.hashedPassword.length > 0
      ? user.hashedPassword
      : DUMMY_PASSWORD_HASH;

  const passwordMatches = await bcrypt.compare(password, hashToCompare);

  if (!user) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: "No Sangam account found for that email.",
    };
  }

  if (!user.hashedPassword) {
    return {
      ok: false,
      code: "NO_PASSWORD",
      message: "No Sangam account found for that email.",
    };
  }

  if (!passwordMatches) {
    return {
      ok: false,
      code: "BAD_PASSWORD",
      message: "The email and password do not match.",
    };
  }

  // Pending/Inactive memberships must not grant role access (see issue #83).
  const memberships: SessionMembership[] = user.memberships
    .filter((m) => m.status === "Active")
    .map((m) => ({
      clubId: m.clubId,
      clubSlug: m.club.slug,
      clubName: m.club.name,
      role: m.role,
      personaName: user.name,
    }));

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      rollNumber: user.rollNumber,
      isFaculty: user.isFaculty,
      memberships,
    },
  };
}
