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

/** Clears the session cookie and returns to /login. Used by the shell's "Log out" control. */
export async function logoutAction() {
  clearAuthCookies();
  redirect("/login");
}
