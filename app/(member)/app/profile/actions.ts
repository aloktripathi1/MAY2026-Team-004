"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthCookieUser, setAuthCookies } from "@/lib/auth-session";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { INTEREST_OPTIONS } from "@/lib/interests";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  interests: z
    .array(z.enum(INTEREST_OPTIONS))
    .min(1, "Choose at least one interest")
    .max(5, "Choose up to five interests"),
});

export type ProfileFormState = { error?: string; ok?: boolean };

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    interests: formData.getAll("interests"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      interests: JSON.stringify(parsed.data.interests),
    },
  });

  // Keep shell/nav name in sync when a real auth session cookie is present.
  // Demo-role mode clears cookies and relies on the DB name via layout.
  const authUser = getAuthCookieUser();
  if (authUser && authUser.id === session.user.id) {
    setAuthCookies({ ...authUser, name: parsed.data.name });
  }

  revalidatePath("/app/profile");
  revalidatePath("/app/clubs");
  revalidatePath("/app");
  return { ok: true };
}
