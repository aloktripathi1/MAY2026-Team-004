import { prisma } from "@/backend/db/prisma";
import type { SessionMembership } from "@/backend/auth/session-cookies";
import {
  buildEventSlug,
  decideCountMeInAction,
  normalizeEventApproval,
  parseTagInput,
} from "@/backend/domain/workflow-rules";
import { serializeEventTags } from "@/lib/event-tags";

function requireCoordinatorForClub(memberships: SessionMembership[], clubId: string) {
  const allowed = memberships.some(
    (m) => m.clubId === clubId && (m.role === "Coordinator" || m.role === "Admin"),
  );
  if (!allowed) throw new Error("Not authorized for this club");
}

export type EventInput = {
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  capacity: number;
  tags?: string;
};

export async function createEvent(memberships: SessionMembership[], clubId: string, input: EventInput) {
  try {
    requireCoordinatorForClub(memberships, clubId);
  } catch {
    return { ok: false, code: "FORBIDDEN", message: "You must be a coordinator for this club." } as const;
  }

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return { ok: false, code: "CLUB_NOT_FOUND", message: "Club not found." } as const;

  const tags = parseTagInput(input.tags ?? "");
  const event = await prisma.event.create({
    data: {
      slug: buildEventSlug(input.title),
      title: input.title,
      description: input.description,
      date: new Date(input.date),
      time: input.time,
      venue: input.venue,
      capacity: input.capacity,
      clubId,
      cover: "linear-gradient(135deg,#7c3aed 0%,#ec4899 60%,#f97316 100%)",
      tags: serializeEventTags(tags),
      status: "upcoming",
      approval: "pending",
    },
  });
  return { ok: true, event } as const;
}

export async function listEvents(filters: { clubId?: string; status?: string }) {
  return prisma.event.findMany({
    where: {
      ...(filters.clubId ? { clubId: filters.clubId } : {}),
      ...(filters.status ? { status: filters.status as "upcoming" | "live" | "past" } : {}),
    },
    include: { club: true },
    orderBy: { date: "asc" },
  });
}

export async function getEventById(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { club: true, _count: { select: { countMeIns: true } } },
  });
  if (!event) return { ok: false, code: "EVENT_NOT_FOUND", message: "Event not found." } as const;
  return { ok: true, event } as const;
}

export async function updateEvent(
  memberships: SessionMembership[],
  eventId: string,
  input: Partial<EventInput>,
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, code: "EVENT_NOT_FOUND", message: "Event not found." } as const;

  try {
    requireCoordinatorForClub(memberships, event.clubId);
  } catch {
    return { ok: false, code: "FORBIDDEN", message: "Not authorized for this club." } as const;
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.date ? { date: new Date(input.date) } : {}),
      ...(input.time ? { time: input.time } : {}),
      ...(input.venue ? { venue: input.venue } : {}),
      ...(input.capacity ? { capacity: input.capacity } : {}),
      ...(input.tags !== undefined ? { tags: serializeEventTags(parseTagInput(input.tags)) } : {}),
    },
  });
  return { ok: true, event: updated } as const;
}

export async function registerForEvent(userId: string, eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { countMeIns: true } } },
  });
  if (!event) return { ok: false, code: "EVENT_NOT_FOUND", message: "Event not found." } as const;

  const existing = await prisma.countMeIn.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });

  if (event.registrationLocked) {
    return {
      ok: false,
      code: "REGISTRATION_LOCKED",
      message: "Registration is locked for this event.",
    } as const;
  }

  let action: "registered" | "cancelled";
  try {
    action =
      decideCountMeInAction(Boolean(existing), {
        status: event.status,
        capacity: event.capacity,
        going: event.going,
        countMeInCount: event._count.countMeIns,
      }) === "cancel"
        ? "cancelled"
        : "registered";
  } catch (err) {
    return {
      ok: false,
      code: "REGISTRATION_UNAVAILABLE",
      message: err instanceof Error ? err.message : "Registration unavailable.",
    } as const;
  }

  if (action === "cancelled") {
    await prisma.countMeIn.delete({ where: { id: existing!.id } });
  } else {
    await prisma.countMeIn.create({ data: { userId, eventId } });
  }
  return { ok: true, action } as const;
}

export async function checkInAttendee(memberships: SessionMembership[], eventId: string, countMeInId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, code: "EVENT_NOT_FOUND", message: "Event not found." } as const;

  try {
    requireCoordinatorForClub(memberships, event.clubId);
  } catch {
    return { ok: false, code: "FORBIDDEN", message: "Not authorized for this club." } as const;
  }

  const countMeIn = await prisma.countMeIn.findUnique({ where: { id: countMeInId } });
  if (!countMeIn || countMeIn.eventId !== eventId) {
    return { ok: false, code: "REGISTRATION_NOT_FOUND", message: "Registration not found for this event." } as const;
  }

  const updated = await prisma.countMeIn.update({ where: { id: countMeInId }, data: { checkedIn: true } });
  return { ok: true, countMeIn: updated } as const;
}

export async function listParticipants(memberships: SessionMembership[], eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, code: "EVENT_NOT_FOUND", message: "Event not found." } as const;

  try {
    requireCoordinatorForClub(memberships, event.clubId);
  } catch {
    return { ok: false, code: "FORBIDDEN", message: "Not authorized for this club." } as const;
  }

  const countMeIns = await prisma.countMeIn.findMany({
    where: { eventId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    ok: true,
    participants: countMeIns.map((c) => ({
      id: c.id,
      userId: c.userId,
      name: c.user.name,
      email: c.user.email,
      checkedIn: c.checkedIn,
      registeredAt: c.createdAt,
    })),
  } as const;
}

export async function checkEventConflicts(date: string, venue: string, excludeEventId?: string) {
  const day = new Date(date);
  const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  return prisma.event.findMany({
    where: {
      venue,
      date: { gte: startOfDay, lt: endOfDay },
      ...(excludeEventId ? { id: { not: excludeEventId } } : {}),
    },
    include: { club: true },
  });
}

export async function setEventApprovalByFaculty(
  isFaculty: boolean,
  eventId: string,
  approval: "approved" | "pending" | "rejected",
) {
  if (!isFaculty) return { ok: false, code: "FORBIDDEN", message: "Faculty only." } as const;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, code: "EVENT_NOT_FOUND", message: "Event not found." } as const;

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { approval: normalizeEventApproval(approval) },
  });
  return { ok: true, event: updated } as const;
}

export async function setRegistrationLock(memberships: SessionMembership[], eventId: string, locked: boolean) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, code: "EVENT_NOT_FOUND", message: "Event not found." } as const;

  try {
    requireCoordinatorForClub(memberships, event.clubId);
  } catch {
    return { ok: false, code: "FORBIDDEN", message: "Not authorized for this club." } as const;
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { registrationLocked: locked },
  });
  return { ok: true, event: updated } as const;
}
