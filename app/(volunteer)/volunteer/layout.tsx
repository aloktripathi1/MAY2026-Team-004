import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/shell/AppShell";

export default async function VolunteerLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const volunteerMembership = session.user.memberships.find((m) => m.role === "Volunteer") ?? session.user.memberships[0];
  const club = volunteerMembership ? `${volunteerMembership.clubName} · Volunteer` : "Sangam · Volunteer";

  return (
    <AppShell role="volunteer" user={session.user.name ?? "Volunteer"} club={club}>
      {children}
    </AppShell>
  );
}
