"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAppSession } from "@/backend/auth/app-session";
import { getPrimaryClubMembership } from "@/backend/auth/roles";
import { createAnnouncement } from "@/backend/domain/announcements";

const schema = z.object({
  title: z.string().min(1, "Headline is required"),
  body: z.string().min(1, "Body is required"),
  pinned: z.coerce.boolean().optional(),
  audience: z.enum(["All", "Coordinators", "Volunteers"]).default("All"),
  priority: z.enum(["Low", "Med", "High"]).default("Med"),
});

export type AnnouncementFormState = { error?: string; ok?: boolean };

export async function createAnnouncementAction(
  _prevState: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  const session = await getAppSession();
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

  try {
    await createAnnouncement(
      { id: session.user.id, memberships: session.user.memberships },
      {
        title: parsed.data.title,
        body: parsed.data.body,
        pinned: parsed.data.pinned ?? false,
        audience: parsed.data.audience,
        priority: parsed.data.priority,
        clubId: membership.clubId,
      },
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not post announcement." };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/admin");
  revalidatePath("/app");
  return { ok: true };
}
