"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/lib/mock-session";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
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

export type NewEventState = { error?: string };

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
  const tags = parsed.data.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);

  const event = await prisma.event.create({
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
      tags: serializeEventTags(tags) as Prisma.EventCreateInput["tags"],
      status: "upcoming",
      approval: "pending",
    },
  });

  revalidatePath("/coordinator");
  revalidatePath("/app/events");
  redirect(`/app/events/${event.slug}`);
}
