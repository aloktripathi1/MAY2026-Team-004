"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/backend/auth/mock-session";
import { getPrimaryClubMembership } from "@/backend/auth/roles";
import { prisma } from "@/backend/db/prisma";
import { parseTagInput } from "@/backend/domain/workflow-rules";
import { requireCoordinatorForClub } from "@/backend/domain/events";
import { serializeEventTags } from "@/lib/event-tags";

async function requireCoordinatorForEvent(eventId: string) {
  const session = await getMockSession();
  if (!session?.user) throw new Error("Not authenticated");
  const membership = getPrimaryClubMembership(session, "Coordinator");
  if (!membership) throw new Error("You must be a club coordinator.");

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.clubId !== membership.clubId) throw new Error("Event not found for this club.");
  return { event, membership };
}

export async function toggleCheckInAction(countMeInId: string, eventSlug: string) {
  const session = await getMockSession();
  if (!session?.user) throw new Error("Not authenticated");

  const countMeIn = await prisma.countMeIn.findUniqueOrThrow({ where: { id: countMeInId } });
  const event = await prisma.event.findUniqueOrThrow({ where: { id: countMeIn.eventId } });
  requireCoordinatorForClub(session.user.memberships, event.clubId);

  await prisma.countMeIn.update({ where: { id: countMeInId }, data: { checkedIn: !countMeIn.checkedIn } });

  revalidatePath(`/coordinator/events/${eventSlug}`);
}

const editEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  venue: z.string().min(1, "Venue is required"),
  capacity: z.coerce.number().int().positive(),
  tags: z.string().optional().default(""),
});

export type EditEventState = { error?: string; ok?: boolean };

export async function updateEventAction(eventId: string, eventSlug: string, _prevState: EditEventState, formData: FormData): Promise<EditEventState> {
  try {
    await requireCoordinatorForEvent(eventId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not authorized" };
  }

  const parsed = editEventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    date: formData.get("date"),
    time: formData.get("time"),
    venue: formData.get("venue"),
    capacity: formData.get("capacity"),
    tags: formData.get("tags"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { title, description, date, time, venue, capacity } = parsed.data;
  const tags = parseTagInput(parsed.data.tags);

  await prisma.event.update({
    where: { id: eventId },
    data: { title, description, date: new Date(date), time, venue, capacity, tags: serializeEventTags(tags) },
  });

  revalidatePath(`/coordinator/events/${eventSlug}`);
  revalidatePath("/coordinator");
  return { ok: true };
}
