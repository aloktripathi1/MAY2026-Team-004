import type { ReactNode } from "react";
import { getMockSession } from "@/backend/auth/mock-session";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { accessibleAppRoles } from "@/backend/auth/roles";

export default async function CoordinatorLayout({ children }: { children: ReactNode }) {
  const session = await getMockSession();
  if (!session?.user) redirect("/login");

  const membership = session.user.memberships.find((m) => m.role === "Coordinator") ?? session.user.memberships[0];
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
