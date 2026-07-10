import type { Metadata } from "next";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { JoinRequestButton } from "./JoinRequestButton";

export const metadata: Metadata = {
  title: "My clubs · Sangam",
  description: "Clubs you belong to and clubs to discover.",
};

export default async function AppClubs() {
  const session = getMockSession();
  const myClubIds = new Set(session!.user.memberships.map((m) => m.clubId));

  const [allClubs, pendingMemberships] = await Promise.all([
    prisma.club.findMany({ orderBy: { name: "asc" } }),
    prisma.membership.findMany({
      where: { userId: session!.user.id, status: "Pending" },
    }),
  ]);
  const pendingClubIds = new Set(pendingMemberships.map((m) => m.clubId));
  const my = allClubs.filter((c) => myClubIds.has(c.id));
  const discover = allClubs.filter((c) => !myClubIds.has(c.id));

  return (
    <>
      <PageHeader eyebrow="Membership" title={<>Your <span className="text-secondary">clubs.</span></>} description={`${my.length} you're in. ${discover.length} waiting to be discovered.`} />
      <div>
        <div className="text-mono-label mb-3">You're a member of</div>
        <div className="grid gap-3 md:grid-cols-2">
          {my.length === 0 && <div className="text-sm text-muted-foreground">You haven't joined any clubs yet.</div>}
          {my.map(c => (
            <GlassCard key={c.id} className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.banner} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="text-base font-medium">{c.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{c.tagline}</div>
              </div>
              <StatusPill tone="green">Approved</StatusPill>
            </GlassCard>
          ))}
        </div>
      </div>
      <div className="mt-10">
        <div className="text-mono-label mb-3">Discover more</div>
        <div className="grid gap-3 md:grid-cols-3">
          {discover.map(c => (
            <GlassCard key={c.id} className="overflow-hidden">
              <div className="relative -m-5 mb-4 h-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.banner} alt="" className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute inset-x-4 bottom-3 flex items-end justify-between">
                  <div className="text-2xl" style={{ color: `oklch(0.9 0.2 ${c.hue})` }}>{c.emoji}</div>
                  <StatusPill tone={c.active ? "lime" : "slate"}>{c.active ? "Active" : "Quiet"}</StatusPill>
                </div>
              </div>
              <div className="text-sm font-medium">{c.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.tagline}</div>
              <JoinRequestButton clubId={c.id} initialRequested={pendingClubIds.has(c.id)} />
            </GlassCard>
          ))}
        </div>
      </div>
    </>
  );
}
