import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, CalendarClock, MapPin, Users2 } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/ui/primitives";
import { formatEventDate } from "@/lib/format";
import { RsvpButton } from "./RsvpButton";

async function getEvent(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    include: { club: true, _count: { select: { rsvps: true } } },
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

  const session = await getServerSession(authOptions);
  const myRsvp = await prisma.rsvp.findUnique({
    where: { userId_eventId: { userId: session!.user.id, eventId: event.id } },
  });

  return (
    <>
      <Link href="/app/events" className="text-mono-label mb-6 inline-flex items-center gap-1.5 hover:text-foreground"><ArrowLeft className="h-3 w-3" /> All events</Link>

      <div className="relative overflow-hidden rounded-3xl" style={{ background: event.cover }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="relative flex min-h-[280px] flex-col justify-end p-8 md:min-h-[380px] md:p-12">
          <div className="mb-3 flex gap-1.5">
            {event.tags.split(",").map((t) => <span key={t} className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white backdrop-blur">{t}</span>)}
            <StatusPill tone={event.approval === "approved" ? "green" : event.approval === "pending" ? "amber" : "slate"}>
              {event.approval === "approved" ? "Approved" : event.approval === "pending" ? "Pending approval" : "No approval needed"}
            </StatusPill>
          </div>
          <div className="text-mono-label mb-2 text-white/80">{event.club.name}</div>
          <h1 className="text-display text-4xl leading-[1] text-white md:text-6xl">{event.title}</h1>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <div className="text-mono-label mb-3">About</div>
            <p className="text-base leading-relaxed text-foreground/90">{event.description}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <InfoTile icon={CalendarClock} label="When" value={`${formatEventDate(event.date)} · ${event.time}`} />
            <InfoTile icon={MapPin} label="Where" value={event.venue} />
            <InfoTile icon={Users2} label="Capacity" value={`${event._count.rsvps} / ${event.capacity}`} />
          </div>

          <div className="glass-strong rounded-2xl p-6">
            <div className="text-mono-label mb-4">Who's going</div>
            <div className="flex flex-wrap gap-2">
              {["AR", "KM", "ID", "AS", "MN", "DK", "VS", `+ ${Math.max(event._count.rsvps - 7, 0)}`].map((i, idx) => (
                <div key={idx} className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold ring-2 ring-background"
                  style={{ background: `oklch(0.72 0.18 ${(idx * 47) % 360} / 25%)`, color: `oklch(0.9 0.2 ${(idx * 47) % 360})` }}>
                  {i}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="glass-strong rounded-2xl p-6">
            <div className="text-mono-label mb-2">Your RSVP</div>
            <RsvpButton
              eventId={event.id}
              eventSlug={event.slug}
              initialRsvped={Boolean(myRsvp)}
              capacity={event.capacity}
              going={event._count.rsvps}
            />
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="text-mono-label mb-3">Organizers</div>
            <div className="space-y-3">
              {["Ananya Rao — Head", "Kabir Menon — Coord", "Ishita D. — Volunteer"].map(o => (
                <div key={o} className="text-sm text-muted-foreground">{o}</div>
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
    <div className="glass rounded-2xl p-5">
      <Icon className="mb-3 h-4 w-4 text-primary" />
      <div className="text-mono-label">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
