"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMockSession } from "@/backend/auth/mock-session";
import { CLUB_CATEGORIES, submitClubRequest } from "@/backend/domain/club-requests";

/**
 * Any signed-in student may propose a club; faculty decide. Kept in its own file
 * rather than added to clubs/actions.ts so the join-request flow and the
 * club-proposal flow stay separately readable.
 */

const schema = z.object({
  name: z.string().trim().min(3, "Club name must be at least 3 characters").max(60, "Club name is too long"),
  tagline: z.string().trim().min(10, "Add a one-line tagline (at least 10 characters)").max(120, "Tagline is too long"),
  category: z.enum(CLUB_CATEGORIES as [string, ...string[]], { errorMap: () => ({ message: "Choose a category" }) }),
  description: z
    .string()
    .trim()
    .min(60, "Describe the club in at least 60 characters so faculty can judge it")
    .max(1200, "Description is too long"),
  emoji: z.string().trim().max(4, "Pick a single symbol").optional(),
});

export type ClubRequestState = { error?: string; ok?: boolean; message?: string };

export async function submitClubRequestAction(
  _prevState: ClubRequestState,
  formData: FormData,
): Promise<ClubRequestState> {
  const session = await getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  const parsed = schema.safeParse({
    name: formData.get("name"),
    tagline: formData.get("tagline"),
    category: formData.get("category"),
    description: formData.get("description"),
    emoji: formData.get("emoji") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const result = await submitClubRequest(session.user.id, {
    name: parsed.data.name,
    tagline: parsed.data.tagline,
    category: parsed.data.category as (typeof CLUB_CATEGORIES)[number],
    description: parsed.data.description,
    emoji: parsed.data.emoji,
  });
  if (!result.ok) return { error: result.message };

  // submitClubRequest emails the proposer and faculty itself.
  revalidatePath("/app/clubs");
  revalidatePath("/faculty/club-requests");
  return { ok: true, message: "Proposal sent. Faculty will review it and you'll get an email either way." };
}
