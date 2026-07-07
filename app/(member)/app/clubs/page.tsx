import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "My clubs · Sangam",
  description: "Clubs you belong to and clubs to discover.",
};

export default async function AppClubs() {
  const session = await getServerSession(authOptions);
  const myClubIds = new Set(session!.user.memberships.map((m) => m.clubId));

  const allClubs = await prisma.club.findMany({ orderBy: { name: "asc" } });
  const my = allClubs.filter((c) => myClubIds.has(c.id));
  const discover = allClubs.filter((c) => !myClubIds.has(c.id));

  return (
    <>
      <PageHeader eyebrow="Membership" title={<>Your <span className="text-display text-primary italic">clubs.</span></>} description={`${my.length} you're in. ${discover.length} waiting to be discovered.`} />
      <div>
        <div className="text-mono-label mb-3">You're a member of</div>
        <div className="grid gap-3 md:grid-cols-2">
          {my.length === 0 && <div className="text-sm text-muted-foreground">You haven't joined any clubs yet.</div>}
          {my.map(c => (
            <GlassCard key={c.id} className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl"
                   style={{ background: `oklch(0.72 0.18 ${c.hue} / 15%)`, color: `oklch(0.92 0.2 ${c.hue})` }}>{c.emoji}</div>
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
            <GlassCard key={c.id}>
              <div className="mb-4 flex items-start justify-between">
                <div className="text-3xl" style={{ color: `oklch(0.9 0.2 ${c.hue})` }}>{c.emoji}</div>
                <StatusPill tone={c.active ? "lime" : "slate"}>{c.active ? "Active" : "Quiet"}</StatusPill>
              </div>
              <div className="text-sm font-medium">{c.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.tagline}</div>
              <button className="mt-4 w-full rounded-xl bg-surface-2 py-2 text-xs transition hover:bg-primary hover:text-primary-foreground">Request to join →</button>
            </GlassCard>
          ))}
        </div>
      </div>
    </>
  );
}
