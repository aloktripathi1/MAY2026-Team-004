"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/backend/auth/mock-session";
import { prisma } from "@/backend/db/prisma";

const feedbackSchema = z.object({
  message: z.string().trim().min(1, "Feedback can't be empty").max(2000, "Keep it under 2000 characters"),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

export type FeedbackFormState = { error?: string; ok?: boolean };

export async function submitFeedbackAction(_prevState: FeedbackFormState, formData: FormData): Promise<FeedbackFormState> {
  const session = await getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  const ratingRaw = formData.get("rating");
  const parsed = feedbackSchema.safeParse({
    message: formData.get("message"),
    rating: ratingRaw ? ratingRaw : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.feedback.create({
    data: {
      userId: session.user.id,
      message: parsed.data.message,
      rating: parsed.data.rating ?? null,
    },
  });

  revalidatePath("/app/feedback");
  return { ok: true };
}
