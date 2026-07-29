import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageSession } from "@/backend/auth/page-session";
import { ArrowLeft, CalendarClock, MapPin, Users2 } from "lucide-react";
import { prisma } from "@/backend/db/prisma";
import { StatusPill } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { normalizeEventTags } from "@/lib/event-tags";
import { formatEventDate } from "@/lib/format";
import { isEventPast } from "@/backend/domain/workflow-rules";
import { CountMeInButton } from "./CountMeInButton";

async function getEvent(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    include: { club: true, _count: { select: { countMeIns: true } } },
  });
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const event = await getEvent(params.id);
  return {
    title: event ? `${event.title} · Sangam` : "Event · Sangam",
    description: event?.description ?? "Event on Sangam.",
  };
}

export default async function EventDetail({ params }: { params: { id: string } }) {
  const event = await getEvent(params.id);
  if (!event) notFound();

  const session = await requirePageSession();
  const [myCountMeIn, attendees, organizers] = await Promise.all([
    prisma.countMeIn.findUnique({
      where: { userId_eventId: { userId: session.user.id, eventId: event.id } },
    }),
    prisma.countMeIn.findMany({
      where: { eventId: event.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    prisma.membership.findMany({
      where: { clubId: event.clubId, role: { in: ["Admin", "Coordinator"] } },
      include: { user: true },
      orderBy: { role: "asc" },
    }),
  ]);

  const extraCount = Math.max(event._count.countMeIns - attendees.length, 0);

  return (
    <>
      <Link href="/app/events" className="text-mono-label mb-6 inline-flex items-center gap-1.5 hover:text-foreground"><ArrowLeft className="h-3 w-3" /> All events</Link>

      <div className="relative overflow-hidden rounded-3xl" style={{ background: event.cover }}>
        {event.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="relative flex min-h-[280px] flex-col justify-end p-8 md:min-h-[380px] md:p-12">
          <div className="mb-3 flex gap-1.5">
            {normalizeEventTags(event.tags).map((t) => <span key={t} className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white backdrop-blur">{t}</span>)}
            <StatusPill tone={event.approval === "approved" ? "green" : event.approval === "pending" ? "amber" : event.approval === "rejected" ? "magenta" : "slate"}>
              {event.approval === "approved" ? "Approved" : event.approval === "pending" ? "Pending approval" : event.approval === "rejected" ? "Rejected" : "No approval needed"}
            </StatusPill>
          </div>
          <div className="text-mono-label mb-2 text-white/80">{event.club.name}</div>
          <h1 className="text-display text-4xl leading-[1] text-white md:text-6xl">{event.title}</h1>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="night-panel rounded-2xl p-6">
            <div className="text-mono-label mb-3">About</div>
            <p className="text-base leading-relaxed text-foreground/90">{event.description}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <InfoTile icon={CalendarClock} label="When" value={`${formatEventDate(event.date)} · ${event.time}`} />
            <InfoTile icon={MapPin} label="Where" value={event.venue} />
            <InfoTile icon={Users2} label="Capacity" value={`${event._count.countMeIns} / ${event.capacity}`} />
          </div>

          <div className="night-panel rounded-2xl p-6">
            <div className="text-mono-label mb-4">Who's going</div>
            {attendees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one's counted themselves in yet - be the first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {attendees.map((r) => (
                  <div key={r.id} title={r.user.name} className="ring-2 ring-background">
                    <Avatar name={r.user.name} image={r.user.image} size="sm" />
                  </div>
                ))}
                {extraCount > 0 && (
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.06] text-xs font-semibold text-muted-foreground ring-2 ring-background">
                    +{extraCount}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="night-panel rounded-2xl p-6">
            <div className="text-mono-label mb-2">Your spot</div>
            <CountMeInButton
              eventId={event.id}
              eventSlug={event.slug}
              initialCountedIn={Boolean(myCountMeIn)}
              capacity={event.capacity}
              going={event._count.countMeIns}
              isPast={isEventPast(event)}
            />
          </div>

          <div className="night-panel rounded-2xl p-6">
            <div className="text-mono-label mb-3">Organizers</div>
            <div className="space-y-3">
              {organizers.length === 0 && <div className="text-sm text-muted-foreground">No organizers assigned yet.</div>}
              {organizers.map((m) => (
                <div key={m.id} className="text-sm text-muted-foreground">{m.user.name} - {m.role}</div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="night-panel rounded-2xl p-5">
      <Icon className="mb-3 h-4 w-4 text-secondary" />
      <div className="text-mono-label">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
