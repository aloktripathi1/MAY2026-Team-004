import { getAuthCookieUser, setAuthCookies } from "@/backend/auth/session-cookies";
import { getCurrentUserById } from "@/backend/auth/get-current-user";
import { jsonError, jsonSuccess } from "@/backend/api/http";

/**
 * User Story 1.1 — Institutional Credential Verification (session identity)
 * plus multi-role membership surface for the signed-in user.
 */
const USER_STORY = "1.1";

/**
 * GET /api/auth/me — return the current user and all held roles/memberships.
 *
 * Production path only: requires real session cookies from signup/login.
 * Does NOT use getMockSession() demo fallback (kept separate in lib/mock-session.ts
 * and /api/auth/[...nextauth]).
 */
export async function GET() {
  const cookieUser = getAuthCookieUser();
  if (!cookieUser) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", {
      status: 401,
      userStory: USER_STORY,
    });
  }

  try {
    const result = await getCurrentUserById(cookieUser.id);
    if (!result.ok) {
      return jsonError("UNAUTHENTICATED", result.message, {
        status: 401,
        userStory: USER_STORY,
      });
    }

    // Refresh cookies from DB so membership/role changes stay in sync.
    setAuthCookies({
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      isFaculty: result.user.isFaculty,
      memberships: result.user.memberships,
    });

    return jsonSuccess(result.user, { status: 200, userStory: USER_STORY });
  } catch (error) {
    console.error("[GET /api/auth/me]", error);
    return jsonError("INTERNAL_ERROR", "Could not load current user. Please try again.", {
      status: 500,
      userStory: USER_STORY,
    });
  }
}
