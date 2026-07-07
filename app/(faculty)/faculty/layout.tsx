import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/shell/AppShell";

export default async function FacultyLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!session.user.isFaculty) redirect("/app");

  return (
    <AppShell role="faculty" user={session.user.name ?? "Faculty"} club="Faculty Mentor">
      {children}
    </AppShell>
  );
}
