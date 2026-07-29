import { redirect } from "next/navigation";
import { getMockSession } from "@/backend/auth/mock-session";

/**
 * Page-level authentication guard. Layouts and child pages can render in
 * parallel, so a layout redirect alone cannot protect a child dereference.
 */
export async function requirePageSession() {
  const session = await getMockSession();
  if (!session?.user) redirect("/login");
  return session;
}
export async function requirePageMembership(role: string) {
  const session = await requirePageSession();
  const membership = session.user.memberships.find(
    (candidate) => candidate.role === role,
  );
  if (!membership) redirect("/app");
  return { session, membership };
}
