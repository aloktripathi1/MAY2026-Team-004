import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ClubsBrowser } from "./ClubsBrowser";

export const metadata: Metadata = {
  title: "Browse clubs · Sangam",
  description: "Discover every active society and club at IITM BS.",
};

export default async function ClubsPage() {
  const clubs = await prisma.club.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { memberships: true } } },
  });

  const clubList = clubs.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    category: c.category,
    active: c.active,
    hue: c.hue,
    emoji: c.emoji,
    founded: c.founded,
    description: c.description,
    members: c._count.memberships,
    banner: c.banner,
    photo: c.photo ?? undefined,
  }));

  return <ClubsBrowser clubs={clubList} />;
}
