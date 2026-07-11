"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";

const schema = z.object({
  title: z.string().min(1, "Headline is required"),
  body: z.string().min(1, "Body is required"),
  pinned: z.coerce.boolean().optional(),
  audience: z.enum(["All", "Coordinators", "Volunteers"]).default("All"),
});

export type AnnouncementFormState = { error?: string };

export async function createAnnouncementAction(_prevState: AnnouncementFormState, formData: FormData): Promise<AnnouncementFormState> {
  const session = getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  const membership = getPrimaryClubMembership(session, "Admin");
  if (!membership) return { error: "You must be a club admin to post announcements." };

  const parsed = schema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    pinned: formData.get("pinned") === "on",
    audience: formData.get("audience") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      pinned: parsed.data.pinned ?? false,
      audience: parsed.data.audience,
      clubId: membership.clubId,
      authorId: session.user.id,
    },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/admin");
  revalidatePath("/app");
  return {};
}
