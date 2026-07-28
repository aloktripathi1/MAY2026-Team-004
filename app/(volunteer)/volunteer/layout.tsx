import type { ReactNode } from "react";
import { getMockSession } from "@/backend/auth/mock-session";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { accessibleAppRoles } from "@/backend/auth/roles";

export default async function VolunteerLayout({ children }: { children: ReactNode }) {
  const session = await getMockSession();
  if (!session?.user) redirect("/login");

  const volunteerMembership = session.user.memberships.find((m) => m.role === "Volunteer") ?? session.user.memberships[0];
  const club = volunteerMembership ? volunteerMembership.clubName : "Sangam";
  const user = volunteerMembership ? volunteerMembership.personaName : (session.user.name ?? "Volunteer");

  return (
    <AppShell
      role="volunteer"
      user={user}
      club={club}
      availableRoles={accessibleAppRoles(session.user)}
    >
      {children}
    </AppShell>
  );
}
