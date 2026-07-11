"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { parseNotificationPrefs, type NotificationPrefs } from "@/lib/notification-prefs";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  image: z.string().optional(),
});

export type ProfileFormState = { error?: string; ok?: boolean };

export async function updateProfileAction(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const session = getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    image: formData.get("image") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      ...(parsed.data.image ? { image: parsed.data.image } : {}),
    },
  });

  revalidatePath("/app/profile");
  return { ok: true };
}

export async function toggleNotificationPrefAction(key: keyof NotificationPrefs) {
  const session = getMockSession();
  if (!session?.user) throw new Error("Not authenticated");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const current = parseNotificationPrefs(user?.notificationPrefs);
  const next = { ...current, [key]: !current[key] };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationPrefs: JSON.stringify(next) },
  });

  revalidatePath("/app/profile");
}
