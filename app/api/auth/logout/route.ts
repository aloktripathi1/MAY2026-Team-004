import { clearAuthCookies } from "@/backend/auth/session-cookies";
import { jsonSuccess } from "@/backend/api/http";

/** User Story 1.1 — Institutional Credential Verification (session teardown) */
const USER_STORY = "1.1";

/**
 * POST /api/auth/logout — clears the signed session cookie.
 *
 * Sangam has no separate bearer/access token — the signed session cookie
 * IS the credential (see backend/auth/session-cookies.ts). There is nothing
 * else to revoke: once this cookie is cleared, the browser has no way to
 * re-authenticate as this user without signing in again. A raw copy of the
 * cookie value made before logout would still verify (it's a stateless HMAC
 * signature, not a server-side session record) — if that threat matters for
 * your deployment, move to a server-side session store with revocation.
 */
export async function POST() {
  clearAuthCookies();
  return jsonSuccess({ loggedOut: true }, { status: 200, userStory: USER_STORY });
}
