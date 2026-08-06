"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/backend/auth/mock-session";
import { prisma } from "@/backend/db/prisma";
import { getPrimaryClubMembership } from "@/backend/auth/roles";
import { notifyAnnouncement } from "@/backend/email/notifications";

const schema = z.object({
  title: z.string().min(1, "Headline is required"),
  body: z.string().min(1, "Body is required"),
  pinned: z.coerce.boolean().optional(),
  audience: z.enum(["All", "Coordinators", "Volunteers"]).default("All"),
  priority: z.enum(["Low", "Med", "High"]).default("Med"),
});

export type AnnouncementFormState = { error?: string; ok?: boolean };

export async function createAnnouncementAction(_prevState: AnnouncementFormState, formData: FormData): Promise<AnnouncementFormState> {
  const session = await getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  const membership = getPrimaryClubMembership(session, "Admin");
  if (!membership) return { error: "You must be a club admin to post announcements." };

  const parsed = schema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    pinned: formData.get("pinned") === "on",
    audience: formData.get("audience") || undefined,
    priority: formData.get("priority") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const announcement = await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      pinned: parsed.data.pinned ?? false,
      audience: parsed.data.audience,
      priority: parsed.data.priority,
      clubId: membership.clubId,
      authorId: session.user.id,
    },
  });

  // High priority mails the audience now; Low and Med are picked up by the
  // daily digest sweep instead, so a busy club doesn't flood inboxes.
  await notifyAnnouncement(announcement.id);

  revalidatePath("/admin/announcements");
  revalidatePath("/admin");
  revalidatePath("/app");
  return { ok: true };
}
