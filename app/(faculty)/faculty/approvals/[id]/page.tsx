import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPin } from "lucide-react";
import { prisma } from "@/backend/db/prisma";
import { StatusPill } from "@/components/ui/primitives";
import { normalizeEventTags } from "@/lib/event-tags";
import { formatEventDate } from "@/lib/format";
import { FacultyApprovalButtons } from "../FacultyApprovalButtons";

async function getEvent(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    include: { club: true },
  });
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const event = await getEvent(params.id);
  return {
    title: event ? `${event.title} · Faculty Approval · Sangam` : "Event · Sangam",
    description: event?.description ?? "Event approval on Sangam.",
  };
}

export default async function FacultyEventDetail({ params }: { params: { id: string } }) {
  const event = await getEvent(params.id);
  if (!event) notFound();

  return (
    <>
      <Link href="/faculty/approvals" className="text-mono-label mb-6 inline-flex items-center gap-1.5 hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to approvals</Link>

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

          <div className="night-panel rounded-2xl p-6">
            <div className="text-mono-label mb-4">Event Details</div>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground">Date & Time</div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <CalendarClock className="h-4 w-4 text-secondary" />
                  {formatEventDate(event.date)} at {event.time}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Location</div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-secondary" />
                  {event.venue}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Capacity</div>
                <div className="mt-1 text-sm">{event.capacity} attendees</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="night-panel rounded-2xl p-6">
            <div className="text-mono-label mb-4">Approval Status</div>
            {event.approval === "pending" ? (
              <>
                <div className="mb-4 text-sm text-muted-foreground">This event is awaiting your approval. Review the details and decide whether to approve or reject.</div>
                <div className="mt-6">
                  <FacultyApprovalButtons eventId={event.id} layout="horizontal" />
                </div>
              </>
            ) : (
              <div className="text-sm">
                <div className="mb-2">Status:</div>
                <StatusPill tone={event.approval === "approved" ? "green" : "magenta"}>
                  {event.approval === "approved" ? "Approved" : "Rejected"}
                </StatusPill>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
