import type { ReactNode } from "react";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const session = getMockSession();
  if (!session?.user) redirect("/login");

  const profile = await prisma.user.findUnique({ where: { id: session.user.id } });
  const primaryClub = session.user.memberships[0]?.clubName ?? "Sangam";
  const displayName = profile?.name ?? session.user.name ?? "Member";

  return (
    <AppShell role="member" user={displayName} club={primaryClub}>
      {children}
    </AppShell>
  );
}
