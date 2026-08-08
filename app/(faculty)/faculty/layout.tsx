import type { ReactNode } from "react";
import { getAppSession } from "@/backend/auth/app-session";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { accessibleAppRoles } from "@/backend/auth/roles";

export default async function FacultyLayout({ children }: { children: ReactNode }) {
  const session = await getAppSession();
  if (!session?.user) redirect("/login");
  if (!session.user.isFaculty) redirect("/app");

  return (
    <AppShell
      role="faculty"
      user={session.user.name ?? "Faculty"}
      availableRoles={accessibleAppRoles(session.user)}
    >
      {children}
    </AppShell>
  );
}
