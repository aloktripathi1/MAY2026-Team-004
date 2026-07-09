import type { Metadata } from "next";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
import { MembersDirectory } from "./MembersDirectory";

export const metadata: Metadata = {
  title: "Members · Admin · Sangam",
  description: "Central member directory.",
};

export default async function MembersPage() {
  const session = getMockSession();
  const membership = getPrimaryClubMembership(session!, "Admin");
  const clubId = membership!.clubId;

  const memberships = await prisma.membership.findMany({
    where: { clubId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  const rows = memberships.map((m) => ({
    id: m.id,
    name: m.user.name,
    roll: m.user.rollNumber ?? "—",
    role: m.role,
    status: m.status,
    joined: m.joinedAt.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
  }));

  return <MembersDirectory members={rows} />;
}
