import { redirect } from "next/navigation";
import { getAppSession } from "@/backend/auth/app-session";
import { resolveSurfaceMembership } from "@/backend/auth/roles";

/**
 * Page-level authentication guard. Layouts and child pages can render in
 * parallel, so a layout redirect alone cannot protect a child dereference.
 */
export async function requirePageSession() {
  const session = await getAppSession();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requirePageMembership(role: string) {
  const session = await requirePageSession();
  const membership = resolveSurfaceMembership(session.user.memberships, role);
  if (!membership) redirect("/app");
  return { session, membership };
}
