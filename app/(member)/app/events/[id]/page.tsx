import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMockSession } from "@/lib/mock-session";
import { ArrowLeft, CalendarClock, MapPin, Users2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/ui/primitives";
import { normalizeEventTags } from "@/lib/event-tags";
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

  const session = getMockSession();
  const [myRsvp, attendees, organizers] = await Promise.all([
    prisma.rsvp.findUnique({
      where: { userId_eventId: { userId: session!.user.id, eventId: event.id } },
    }),
    prisma.rsvp.findMany({
      where: { eventId: event.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.membership.findMany({
      where: { clubId: event.clubId, role: { in: ["Admin", "Coordinator"] } },
      include: { user: true },
      orderBy: { role: "asc" },
    }),
  ]);

  const shownAttendees = attendees.slice(0, 8);
  const extraAttendees = attendees.slice(8);
  const extraCount = extraAttendees.length;

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
            <InfoTile icon={Users2} label="Capacity" value={`${event._count.rsvps} / ${event.capacity}`} />
          </div>

          <div className="night-panel rounded-2xl p-6">
            <div className="text-mono-label mb-4">Who's going</div>
            {shownAttendees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one's RSVP'd yet - be the first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {shownAttendees.map((r) => {
                  const female = isFemaleName(r.user.name);
                  return (
                    <div
                      key={r.id}
                      className="group relative grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] ring-2 ring-background"
                    >
                      {female ? <FemalePictogram /> : <MalePictogram />}
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-surface-2 px-2 py-1 text-[11px] font-medium text-foreground opacity-0 shadow-lg transition duration-150 group-hover:opacity-100">
                        {r.user.name}
                      </span>
                    </div>
                  );
                })}
                {extraCount > 0 && (
                  <div className="group relative grid h-9 w-9 place-items-center rounded-lg bg-white/[0.06] text-xs font-semibold text-muted-foreground ring-2 ring-background">
                    +{extraCount}
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-surface-2 px-2 py-1 text-[11px] font-medium text-foreground opacity-0 shadow-lg transition duration-150 group-hover:opacity-100">
                      {extraAttendees.map((r) => r.user.name).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="night-panel rounded-2xl p-6">
            <div className="text-mono-label mb-2">Your RSVP</div>
            <RsvpButton
              eventId={event.id}
              eventSlug={event.slug}
              initialRsvped={Boolean(myRsvp)}
              capacity={event.capacity}
              going={event._count.rsvps}
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

const FEMALE_FIRST_NAMES = new Set([
  "ananya",
  "ishita",
  "meera",
  "diya",
  "sneha",
  "priya",
]);

function isFemaleName(name: string) {
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return FEMALE_FIRST_NAMES.has(first);
}

function MalePictogram() {
  return (
    <svg viewBox="0 0 40 80" className="h-7 w-3.5" aria-hidden>
      <g fill="#2F80ED">
        <circle cx="20" cy="10" r="8" />
        <path d="M12 22h16l6 24h-6v26h-5V46h-6v26h-5V46H6L12 22z" />
      </g>
    </svg>
  );
}

function FemalePictogram() {
  return (
    <svg viewBox="0 0 40 80" className="h-7 w-3.5" aria-hidden>
      <g fill="#FF5CA8">
        <circle cx="20" cy="10" r="8" />
        {/* arms */}
        <rect x="2.5" y="24" width="5" height="20" rx="2.5" transform="rotate(28 5 24)" />
        <rect x="32.5" y="24" width="5" height="20" rx="2.5" transform="rotate(-28 35 24)" />
        {/* skirt: narrow shoulders → wide hem */}
        <path d="M14 22h12l8 36H6L14 22z" />
        {/* legs */}
        <rect x="14.5" y="58" width="4.5" height="14" rx="1.5" />
        <rect x="21" y="58" width="4.5" height="14" rx="1.5" />
      </g>
    </svg>
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
