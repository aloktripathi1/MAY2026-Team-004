import type { Metadata } from "next";
import { requirePageMembership } from "@/backend/auth/page-session";
import { prisma } from "@/backend/db/prisma";
import { parseInterests } from "@/lib/interests";
import { MembersDirectory } from "./MembersDirectory";

export const metadata: Metadata = {
  title: "Members · Admin · Sangam",
  description: "Central member directory.",
};

export default async function MembersPage() {
  const { membership } = await requirePageMembership("Admin");
  const clubId = membership.clubId;

  const memberships = await prisma.membership.findMany({
    where: { clubId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  const rows = memberships.map((m) => ({
    id: m.id,
    name: m.user.name,
    roll: m.user.rollNumber ?? "-",
    role: m.role,
    status: m.status,
    joined: m.joinedAt.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    interests: parseInterests(m.user.interests),
  }));

  return <MembersDirectory members={rows} />;
}
