import type { ReactNode } from "react";
import { getMockSession } from "@/backend/auth/mock-session";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { accessibleAppRoles } from "@/backend/auth/roles";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = getMockSession();
  if (!session?.user) redirect("/login");

  const membership = session.user.memberships.find((m) => m.role === "Admin");
  if (!membership) redirect("/app");

  return (
    <AppShell
      role="admin"
      user={membership.personaName}
      club={membership.clubName}
      availableRoles={accessibleAppRoles(session.user)}
    >
      {children}
    </AppShell>
  );
}
