import type { Metadata } from "next";
import { requirePageSession } from "@/backend/auth/page-session";
import { prisma } from "@/backend/db/prisma";
import { parseInterests } from "@/lib/interests";
import { INTEREST_CATEGORY_MAP } from "@/lib/club-interests";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { ClubDiscoveryCard, type DiscoverClub } from "./ClubDiscoveryCard";
import { DiscoverClubsSection } from "./DiscoverClubsSection";
import { listClubRequestsForUser } from "@/backend/domain/club-requests";
import { ProposeClub } from "./ProposeClub";

export const metadata: Metadata = {
  title: "My clubs · Sangam",
  description: "Clubs you belong to and clubs to discover.",
};

export default async function AppClubs() {
  const session = await requirePageSession();
  const myClubIds = new Set(session.user.memberships.map((m) => m.clubId));

  const [allClubs, profile, pendingMemberships, myRequests] = await Promise.all([
    prisma.club.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.membership.findMany({ where: { userId: session.user.id, status: "Pending" } }),
    listClubRequestsForUser(session.user.id),
  ]);

  const pendingClubIds = new Set(pendingMemberships.map((m) => m.clubId));
  const interests = parseInterests(profile?.interests);
  const my = allClubs.filter((c) => myClubIds.has(c.id));
  const discover = allClubs.filter((c) => !myClubIds.has(c.id));
  const scoredDiscover = discover
    .map((club) => ({ club, score: recommendationScore(club, interests) }))
    .sort((a, b) => b.score - a.score || a.club.name.localeCompare(b.club.name));
  const recommended = scoredDiscover.filter((entry) => entry.score > 0).slice(0, 3);
  const recommendedIds = new Set(recommended.map((entry) => entry.club.id));
  const remainingDiscover = discover.filter((club) => !recommendedIds.has(club.id));

  return (
    <>
      <PageHeader title={<>Your <span className="text-secondary">clubs.</span></>} description={`${my.length} you're in. ${discover.length} waiting to be discovered.`} />

      <ProposeClub
        myRequests={myRequests.map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          reviewNote: r.reviewNote,
          clubSlug: r.createdClub?.slug ?? null,
        }))}
      />

      <div>
        <div className="text-mono-label mb-3">You're a member of</div>
        <div className="grid gap-3 md:grid-cols-2">
          {my.length === 0 && <div className="text-sm text-muted-foreground">You haven't joined any clubs yet.</div>}
          {my.map(c => (
            <GlassCard key={c.id} className="flex items-center gap-4">
              <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl text-2xl" style={{ background: c.banner, color: `oklch(0.9 0.2 ${c.hue})` }}>
                {c.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photo} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  c.emoji
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-medium">{c.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{c.tagline}</div>
              </div>
              <StatusPill tone="green">Approved</StatusPill>
            </GlassCard>
          ))}
        </div>
      </div>
      {recommended.length > 0 && (
        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-mono-label">Recommended for you</div>
            <div className="hidden truncate font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground sm:block">
              Based on {interests.join(", ")}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {recommended.map(({ club }) => (
              <ClubDiscoveryCard
                key={club.id}
                club={club}
                recommended
                initialRequested={pendingClubIds.has(club.id)}
              />
            ))}
          </div>
        </div>
      )}
      <div className="mt-10">
        <div className="text-mono-label mb-3">Discover more</div>
        <DiscoverClubsSection
          clubs={remainingDiscover.map((c) => ({
            ...c,
            pendingRequested: pendingClubIds.has(c.id),
          }))}
        />
      </div>
    </>
  );
}

function recommendationScore(club: DiscoverClub & { description: string }, interests: string[]) {
  const haystack = `${club.name} ${club.category} ${club.tagline} ${club.description}`.toLowerCase();
  return interests.reduce((score, interest) => {
    const normalized = interest.toLowerCase();
    const categories = INTEREST_CATEGORY_MAP[normalized] ?? [normalized];
    const categoryMatch = categories.some((category) => club.category.toLowerCase() === category);
    const textMatch = categories.some((category) => haystack.includes(category)) || haystack.includes(normalized);
    return score + (categoryMatch ? 3 : 0) + (textMatch ? 1 : 0);
  }, 0);
}
