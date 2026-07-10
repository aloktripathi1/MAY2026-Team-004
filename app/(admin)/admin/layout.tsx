import type { ReactNode } from "react";
import { getMockSession } from "@/lib/mock-session";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getHeldRoleOptions } from "@/lib/session-helpers";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = getMockSession();
  if (!session?.user) redirect("/login");

  const membership = session.user.memberships.find((m) => m.role === "Admin");
  if (!membership) redirect("/app");

  return (
    <AppShell role="admin" user={session.user.name ?? "Admin"} club={`${membership.clubName} · Admin`} roleOptions={getHeldRoleOptions(session)}>
      {children}
    </AppShell>
  );
}
