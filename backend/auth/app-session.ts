import { getAuthCookieUserId, type SessionMembership } from "@/backend/auth/session-cookies";
import { getCurrentUserById } from "@/backend/auth/get-current-user";

export type { SessionMembership };

/**
 * Resolves the current session from the signed session cookie only:
 * verifies the signature, then loads name/email/role/memberships from the DB.
 * Returns null for missing or tampered cookies — callers must redirect to
 * /login or respond 401. There is no anonymous/demo persona fallback.
 */
export async function getAppSession() {
  const userId = getAuthCookieUserId();
  if (!userId) return null;

  const result = await getCurrentUserById(userId);
  if (!result.ok) return null;

  return {
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      isFaculty: result.user.isFaculty,
      memberships: result.user.memberships,
    },
    expires: "2099-12-31T23:59:59.999Z",
  };
}
