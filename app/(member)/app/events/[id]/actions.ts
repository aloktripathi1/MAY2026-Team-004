"use server";

import { revalidatePath } from "next/cache";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";

export async function toggleRsvpAction(eventId: string, eventSlug: string) {
  const session = getMockSession();
  if (!session?.user) throw new Error("Not authenticated");

  const existing = await prisma.rsvp.findUnique({
    where: { userId_eventId: { userId: session.user.id, eventId } },
  });

  if (existing) {
    await prisma.rsvp.delete({ where: { id: existing.id } });
  } else {
    await prisma.rsvp.create({ data: { userId: session.user.id, eventId } });
  }

  revalidatePath(`/app/events/${eventSlug}`);
  revalidatePath("/app/events");
  revalidatePath("/app");
  revalidatePath("/volunteer/events");
  revalidatePath("/volunteer");
}
