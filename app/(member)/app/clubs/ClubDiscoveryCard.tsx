import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { JoinRequestButton } from "./JoinRequestButton";

export type DiscoverClub = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  active: boolean;
  hue: string;
  emoji: string;
  banner: string;
  photo?: string | null;
};

export function ClubDiscoveryCard({
  club: c,
  recommended = false,
  initialRequested = false,
}: {
  club: DiscoverClub;
  recommended?: boolean;
  initialRequested?: boolean;
}) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="relative -m-5 mb-4 h-28" style={{ background: c.banner }}>
        {c.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.photo} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-x-4 bottom-3 flex items-end justify-between">
          <div className="text-2xl" style={{ color: `oklch(0.9 0.2 ${c.hue})` }}>{c.emoji}</div>
          <StatusPill tone={recommended ? "amber" : c.active ? "lime" : "slate"}>{recommended ? "Match" : c.active ? "Active" : "Quiet"}</StatusPill>
        </div>
      </div>
      <div className="text-sm font-medium text-white">{c.name}</div>
      <div className="mt-1 text-xs text-muted-foreground">{c.tagline}</div>
      <JoinRequestButton clubId={c.id} initialRequested={initialRequested} />
    </GlassCard>
  );
}
