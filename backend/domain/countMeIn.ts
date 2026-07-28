"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getMockSession } from "@/backend/auth/mock-session";
import { prisma } from "@/backend/db/prisma";
import { decideCountMeInAction } from "@/backend/domain/workflow-rules";

export async function toggleCountMeInAction(eventId: string, eventSlug: string) {
  const session = await getMockSession();
  if (!session?.user) throw new Error("Not authenticated");
  const userId = session.user.id;

  // Serializable isolation prevents concurrent toggles for the same event
  // from all reading the same under-capacity count and overbooking it (#73).
  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.countMeIn.findUnique({
          where: { userId_eventId: { userId, eventId } },
        });

        const event = existing
          ? null
          : await tx.event.findUnique({
              where: { id: eventId },
              include: { _count: { select: { countMeIns: true } } },
            });
        const action = decideCountMeInAction(
          Boolean(existing),
          event
            ? {
                status: event.status,
                capacity: event.capacity,
                going: event.going,
                countMeInCount: event._count.countMeIns,
                date: event.date,
              }
            : null,
        );

        if (action === "cancel") {
          await tx.countMeIn.delete({ where: { id: existing!.id } });
        } else {
          await tx.countMeIn.create({ data: { userId, eventId } });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      throw new Error("This event just reached capacity. Please try again.");
    }
    throw err;
  }

  revalidatePath(`/app/events/${eventSlug}`);
  revalidatePath("/app/events");
  revalidatePath("/app");
  revalidatePath("/volunteer/events");
  revalidatePath("/volunteer");
}
