import type { ReactNode } from "react";
import { getMockSession } from "@/lib/mock-session";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getHeldRoleOptions } from "@/lib/session-helpers";

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const session = getMockSession();
  if (!session?.user) redirect("/login");

  const primaryClub = session.user.memberships[0]?.clubName ?? "Sangam";

  return (
    <AppShell role="member" user={session.user.name ?? "Member"} club={primaryClub} roleOptions={getHeldRoleOptions(session)}>
      {children}
    </AppShell>
  );
}
