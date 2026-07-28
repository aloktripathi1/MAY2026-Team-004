import { cookies } from "next/headers";
import { signSessionValue, verifySessionValue } from "@/backend/auth/cookie-signing";

export type SessionMembership = {
  clubId: string;
  clubSlug: string;
  clubName: string;
  role: string;
  personaName: string;
};

export const AUTH_SESSION_COOKIE = "sangam_session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

/**
 * Sets the session cookie to a signed reference to `userId`. Name, email,
 * role, and membership data are intentionally NOT stored client-side —
 * they're loaded fresh from the database on every request (see
 * getCurrentUserById) so a tampered cookie can't grant a different
 * identity or role than the one the server actually issued.
 */
export function setAuthCookies(userId: string) {
  cookies().set(AUTH_SESSION_COOKIE, signSessionValue(userId), cookieOptions);
}

export function clearAuthCookies() {
  cookies().delete(AUTH_SESSION_COOKIE);
}

/** Returns the authenticated user's id, or null if the cookie is missing, malformed, or tampered with. */
export function getAuthCookieUserId(): string | null {
  return verifySessionValue(cookies().get(AUTH_SESSION_COOKIE)?.value);
}
