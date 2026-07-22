"use server";

import { revalidatePath } from "next/cache";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { decideCountMeInAction } from "@/lib/workflow-rules";

export async function toggleCountMeInAction(eventId: string, eventSlug: string) {
  const session = getMockSession();
  if (!session?.user) throw new Error("Not authenticated");

  const existing = await prisma.countMeIn.findUnique({
    where: { userId_eventId: { userId: session.user.id, eventId } },
  });

  const event = existing ? null : await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { countMeIns: true } } },
  });
  const action = decideCountMeInAction(Boolean(existing),
    event
      ? {
          status: event.status,
          capacity: event.capacity,
          going: event.going,
          countMeInCount: event._count.countMeIns,
        }
      : null,
  );

  if (action === "cancel") {
    await prisma.countMeIn.delete({ where: { id: existing!.id } });
  } else {
    await prisma.countMeIn.create({ data: { userId: session.user.id, eventId } });
  }

  revalidatePath(`/app/events/${eventSlug}`);
  revalidatePath("/app/events");
  revalidatePath("/app");
  revalidatePath("/volunteer/events");
  revalidatePath("/volunteer");
}
