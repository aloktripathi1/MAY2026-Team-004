import type { ReactNode } from "react";
import { getMockSession } from "@/backend/auth/mock-session";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { accessibleAppRoles } from "@/backend/auth/roles";

export default async function FacultyLayout({ children }: { children: ReactNode }) {
  const session = await getMockSession();
  if (!session?.user) redirect("/login");
  if (!session.user.isFaculty) redirect("/app");

  return (
    <AppShell
      role="faculty"
      user={session.user.name ?? "Faculty"}
      club="IITM BS"
      availableRoles={accessibleAppRoles(session.user)}
    >
      {children}
    </AppShell>
  );
}
