"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/backend/auth/mock-session";
import { prisma } from "@/backend/db/prisma";
import { INTEREST_OPTIONS } from "@/lib/interests";
import {
  DEFAULT_NOTIFICATION_PREFS,
  parseNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notification-prefs";

const MAX_IMAGE_CHARS = 1_500_000; // ~1MB binary as base64 data URL

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  interests: z
    .array(z.enum(INTEREST_OPTIONS))
    .min(1, "Choose at least one interest")
    .max(5, "Choose up to five interests"),
  image: z
    .string()
    .nullable()
    .refine(
      (value) =>
        value === null ||
        (value.startsWith("data:image/") && value.length <= MAX_IMAGE_CHARS),
      "Image must be a valid image under 1MB",
    ),
});

export type ProfileFormState = { error?: string; ok?: boolean };

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  const imageRaw = formData.get("image");
  const image =
    typeof imageRaw === "string" ? (imageRaw.trim() === "" ? null : imageRaw.trim()) : null;

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    interests: formData.getAll("interests"),
    image,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      interests: JSON.stringify(parsed.data.interests),
      image: parsed.data.image,
    },
  });

  revalidatePath("/app/profile");
  revalidatePath("/app/clubs");
  revalidatePath("/app");
  return { ok: true };
}

export async function toggleNotificationPrefAction(key: keyof NotificationPrefs) {
  const session = await getMockSession();
  if (!session?.user) throw new Error("Not authenticated");

  // The key arrives from the client, so check it against the known set rather
  // than trusting it — otherwise any string would be written into the prefs
  // JSON blob.
  if (!(key in DEFAULT_NOTIFICATION_PREFS)) throw new Error("Unknown notification preference");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const current = parseNotificationPrefs(user?.notificationPrefs);
  const next = { ...current, [key]: !current[key] };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationPrefs: JSON.stringify(next) },
  });

  revalidatePath("/app/profile");
}
