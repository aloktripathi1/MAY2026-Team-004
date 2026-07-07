import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/shell/AppShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const membership = session.user.memberships.find((m) => m.role === "Admin");
  if (!membership) redirect("/app");

  return (
    <AppShell role="admin" user={session.user.name ?? "Admin"} club={`${membership.clubName} · Admin`}>
      {children}
    </AppShell>
  );
}
