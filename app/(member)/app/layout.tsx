import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/shell/AppShell";

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const primaryClub = session.user.memberships[0]?.clubName ?? "Sangam";

  return (
    <AppShell role="member" user={session.user.name ?? "Member"} club={primaryClub}>
      {children}
    </AppShell>
  );
}
