"use server";

import { revalidatePath } from "next/cache";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { decideRsvpAction } from "@/lib/workflow-rules";

export async function toggleRsvpAction(eventId: string, eventSlug: string) {
  const session = getMockSession();
  if (!session?.user) throw new Error("Not authenticated");

  const existing = await prisma.rsvp.findUnique({
    where: { userId_eventId: { userId: session.user.id, eventId } },
  });

  const event = existing ? null : await prisma.event.findUnique({ where: { id: eventId } });
  const action = decideRsvpAction(Boolean(existing),
    event
      ? {
          status: event.status,
          capacity: event.capacity,
          going: event.going,
          rsvpCount: event._count.rsvps,
        }
      : null,
  );

  if (action === "cancel") {
    await prisma.rsvp.delete({ where: { id: existing!.id } });
  } else {
    await prisma.rsvp.create({ data: { userId: session.user.id, eventId } });
  }

  revalidatePath(`/app/events/${eventSlug}`);
  revalidatePath("/app/events");
  revalidatePath("/app");
  revalidatePath("/volunteer/events");
  revalidatePath("/volunteer");
}
