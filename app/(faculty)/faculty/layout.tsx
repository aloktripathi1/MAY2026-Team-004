import type { ReactNode } from "react";
import { getMockSession } from "@/lib/mock-session";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";

export default async function FacultyLayout({ children }: { children: ReactNode }) {
  const session = getMockSession();
  if (!session?.user) redirect("/login");
  if (!session.user.isFaculty) redirect("/app");

  return (
    <AppShell role="faculty" user={session.user.name ?? "Faculty"} club="Faculty Mentor">
      {children}
    </AppShell>
  );
}
