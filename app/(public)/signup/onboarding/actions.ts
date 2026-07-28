"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getAuthCookieUserId } from "@/backend/auth/session-cookies";
import { INTEREST_OPTIONS } from "@/lib/interests";
import { prisma } from "@/backend/db/prisma";

const onboardingSchema = z.object({
  interests: z.array(z.enum(INTEREST_OPTIONS)).min(1, "Choose at least one interest").max(5, "Choose up to five interests"),
});

export type OnboardingState = { error?: string };

export async function completeOnboardingAction(_prevState: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse({
    interests: formData.getAll("interests"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Choose your interests" };
  }

  const userId = getAuthCookieUserId();
  if (!userId) {
    redirect("/signup");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { interests: JSON.stringify(parsed.data.interests) },
  });

  redirect("/app");
}
