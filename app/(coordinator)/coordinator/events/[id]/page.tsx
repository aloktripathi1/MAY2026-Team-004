import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMockSession } from "@/lib/mock-session";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, Stat, StatusPill } from "@/components/ui/primitives";
import { NewEventModal } from "@/components/coordinator/NewEventModal";
import { EditDetailsButton } from "./EditDetailsButton";
import { ParticipantList } from "./ParticipantList";

async function getEventForCoordinator(slug: string, clubId: string) {
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || event.clubId !== clubId) return null;
  return event;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return { title: `Event dashboard · Sangam`, description: "Manage this event." };
}

export default async function CoordinatorEventDashboard({ params }: { params: { id: string } }) {
  const session = getMockSession();
  const membership = getPrimaryClubMembership(session!, "Coordinator");
  const clubId = membership!.clubId;

  const event = await getEventForCoordinator(params.id, clubId);
  if (!event) notFound();

  const [rsvps, tasks] = await Promise.all([
    prisma.rsvp.findMany({ where: { eventId: event.id }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    prisma.task.findMany({ where: { eventId: event.id }, include: { assignee: true } }),
  ]);

  const checkedInCount = rsvps.filter((r) => r.checkedIn).length;
  const volunteerIds = new Set(tasks.map((t) => t.assigneeId));

  const approvalLabel = event.approval === "approved" ? "Approved ✓" : event.approval === "pending" ? "Pending" : "Not required";
  const approvalTone = event.approval === "approved" ? "green" : event.approval === "pending" ? "amber" : "slate";

  return (
    <>
      <PageHeader
        title={<>Event <span className="text-secondary">dashboard.</span></>}
        actions={
          <>
            <EditDetailsButton event={{ id: event.id, slug: event.slug, title: event.title, description: event.description, isoDate: event.date.toISOString().slice(0, 10), time: event.time, venue: event.venue, capacity: event.capacity, tags: event.tags }} />
            <NewEventModal variant="outline" size="sm" label="Create event" />
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Registered" value={rsvps.length} delta={`of ${event.capacity} capacity`} />
        <Stat label="Checked in" value={checkedInCount} delta={`of ${rsvps.length} confirmed`} />
        <Stat label="Volunteers" value={volunteerIds.size} delta={`${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} assigned`} />
        <div className="night-panel relative overflow-hidden rounded-2xl p-5">
          <div className="text-mono-label">Approval</div>
          <div className="mt-3">
            <StatusPill tone={approvalTone as any}>{approvalLabel}</StatusPill>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">by Faculty Mentor</div>
        </div>
      </div>

      <div className="mt-8">
        <GlassCard className="p-0" hover={false}>
          <ParticipantList
            eventSlug={event.slug}
            rows={rsvps.map((r) => ({
              rsvpId: r.id,
              name: r.user.name,
              roll: r.user.rollNumber ?? "-",
              checkedIn: r.checkedIn,
            }))}
          />
        </GlassCard>
      </div>
    </>
  );
}
