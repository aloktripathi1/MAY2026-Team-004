"use server";

import { redirect } from "next/navigation";
import { clearAuthCookies, setAuthCookies } from "@/backend/auth/session-cookies";
import { authenticateUser } from "@/backend/auth/authenticate-user";
import { loginSchema, safeRedirectPath } from "@/backend/auth/login-schema";
import { homePathForUser } from "@/backend/auth/roles";

export type LoginState = { error?: string };

/**
 * Form-based login (existing UI). Shares validation + auth with
 * POST /api/auth/login. Keeps the same user-facing error strings.
 * Mock/demo session remains in lib/mock-session.ts and [...nextauth].
 */
export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    callbackUrl: formData.get("callbackUrl") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password, callbackUrl } = parsed.data;
  const result = await authenticateUser(email, password);
  if (!result.ok) {
    return { error: result.message };
  }

  setAuthCookies(result.user.id);

  const roleHome = homePathForUser({
    isFaculty: result.user.isFaculty,
    memberships: result.user.memberships,
  });
  redirect(safeRedirectPath(callbackUrl, roleHome));
}

const DEMO_ROLE_PATHS = ["/app", "/coordinator", "/volunteer", "/admin", "/faculty"];

// getMockSession() prefers a real signed-in session over the hardcoded demo
// persona (which has memberships across several clubs/roles). Without this,
// a visitor who signed up for a real account first — which has zero
// memberships — would have every demo-role link collapse to /app, since
// each persona layout redirects there when it can't find a matching
// membership. Clearing the cookie first restores the demo session (when
// ALLOW_DEMO_SESSION is enabled — see backend/auth/mock-session.ts) so each
// role link actually shows that role's view; in production, or with the flag
// unset, this simply signs the visitor out to an unauthenticated /login.
export async function demoRoleAction(formData: FormData) {
  const href = formData.get("href");
  const target = typeof href === "string" && DEMO_ROLE_PATHS.includes(href) ? href : "/app";
  clearAuthCookies();
  redirect(target);
}
