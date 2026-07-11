import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { normalizeEventTags } from "@/lib/event-tags";
import { formatEventDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Events · Sangam",
  description: "Every upcoming and past event across your clubs.",
};

export default async function EventsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab: "upcoming" | "past" = searchParams.tab === "past" ? "past" : "upcoming";

  const list = await prisma.event.findMany({
    where: { status: tab },
    orderBy: { date: tab === "upcoming" ? "asc" : "desc" },
    include: { club: true, _count: { select: { rsvps: true } } },
  });

  return (
    <>
      <PageHeader
        eyebrow="What's on"
        title={<>Every event, <span className="text-secondary">every club.</span></>}
        actions={
          <div className="night-panel rounded-xl p-1">
            {(["upcoming", "past"] as const).map(t => (
              <Link key={t} href={`/app/events?tab=${t}`}
                className={`inline-block rounded-lg px-3.5 py-1.5 text-xs capitalize transition ${tab === t ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {t}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {list.map(e => (
          <Link key={e.id} href={`/app/events/${e.slug}`}>
            <GlassCard className="group overflow-hidden p-0">
              <div className="relative h-44 overflow-hidden" style={{ background: e.cover }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute right-3 top-3 flex gap-1.5">
                  {normalizeEventTags(e.tags).map(t => <span key={t} className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur">{t}</span>)}
                </div>
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="text-mono-label !text-[10px] text-white/70">{e.club.name}</div>
                  <div className="mt-0.5 text-white text-lg font-medium">{e.title}</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3 w-3" /> {formatEventDate(e.date)} · {e.time}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{e.venue}</div>
                </div>
                <div className="flex items-center gap-2">
                  {e.status === "upcoming" && <StatusPill tone="lime">{e._count.rsvps}/{e.capacity}</StatusPill>}
                  {e.status === "past" && <StatusPill tone="slate">Logged</StatusPill>}
                </div>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </>
  );
}
