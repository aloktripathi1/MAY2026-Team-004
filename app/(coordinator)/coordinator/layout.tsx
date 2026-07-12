import type { ReactNode } from "react";
import { getMockSession } from "@/lib/mock-session";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";

export default async function CoordinatorLayout({ children }: { children: ReactNode }) {
  const session = getMockSession();
  if (!session?.user) redirect("/login");

  const membership = session.user.memberships.find((m) => m.role === "Coordinator") ?? session.user.memberships[0];
  if (!membership) redirect("/app");

  const club = membership.clubName;

  return (
    <AppShell role="coordinator" user={membership.personaName} club={club}>
      {children}
    </AppShell>
  );
}
