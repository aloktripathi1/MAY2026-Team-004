import type { ReactNode } from "react";
import { getMockSession } from "@/backend/auth/mock-session";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { accessibleAppRoles, resolveSurfaceMembership } from "@/backend/auth/roles";

export default async function CoordinatorLayout({ children }: { children: ReactNode }) {
  const session = await getMockSession();
  if (!session?.user) redirect("/login");

  // Same resolution the pages use, so the shell can't name one club while the
  // page renders another — and so an Admin (who outranks Coordinator) isn't
  // shown a shell for an unrelated club they merely belong to.
  const membership = resolveSurfaceMembership(session.user.memberships, "Coordinator");
  if (!membership) redirect("/app");

  const club = membership.clubName;

  return (
    <AppShell
      role="coordinator"
      user={membership.personaName}
      club={club}
      availableRoles={accessibleAppRoles(session.user)}
    >
      {children}
    </AppShell>
  );
}
