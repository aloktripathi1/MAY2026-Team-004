import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/shell/AppShell";

export default async function CoordinatorLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const membership = session.user.memberships.find((m) => m.role === "Coordinator") ?? session.user.memberships[0];
  if (!membership) redirect("/app");

  const club = `${membership.clubName} · Coordinator`;

  return (
    <AppShell role="coordinator" user={session.user.name ?? "Coordinator"} club={club}>
      {children}
    </AppShell>
  );
}
