"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export type ProfileFormState = { error?: string; ok?: boolean };

export async function updateProfileAction(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const session = getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
    },
  });

  revalidatePath("/app/profile");
  return { ok: true };
}
