"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/backend/auth/mock-session";
import { prisma } from "@/backend/db/prisma";
import { getPrimaryClubMembership } from "@/backend/auth/roles";
import { parseTagInput, buildEventSlug } from "@/backend/domain/workflow-rules";
import { serializeEventTags } from "@/lib/event-tags";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  venue: z.string().min(1, "Venue is required"),
  capacity: z.coerce.number().int().positive(),
  tags: z.string().optional().default(""),
});

export type NewEventState = { error?: string; ok?: boolean };

export async function createEventAction(_prevState: NewEventState, formData: FormData): Promise<NewEventState> {
  const session = getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  const membership = getPrimaryClubMembership(session, "Coordinator");
  if (!membership) return { error: "You must be a club coordinator to create events." };

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    date: formData.get("date"),
    time: formData.get("time"),
    venue: formData.get("venue"),
    capacity: formData.get("capacity"),
    tags: formData.get("tags"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { title, description, date, time, venue, capacity } = parsed.data;
  const tags = parseTagInput(parsed.data.tags);
  const slug = buildEventSlug(title);

  await prisma.event.create({
    data: {
      slug,
      title,
      description,
      date: new Date(date),
      time,
      venue,
      capacity,
      clubId: membership.clubId,
      cover: "linear-gradient(135deg,#7c3aed 0%,#ec4899 60%,#f97316 100%)",
      tags: serializeEventTags(tags),
      status: "upcoming",
      approval: "pending",
    },
  });

  revalidatePath("/coordinator");
  revalidatePath("/coordinator/new");
  revalidatePath("/app/events");
  return { ok: true };
}
