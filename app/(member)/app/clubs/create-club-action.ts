"use server";

import { getMockSession } from "@/backend/auth/mock-session";
import { requestClubCreation, type ClubCreationInput } from "@/backend/domain/club-creation";

export async function createClubRequestAction(_prevState: any, formData: FormData) {
  const session = await getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  const input: ClubCreationInput = {
    name: formData.get("name") as string,
    tagline: formData.get("tagline") as string,
    category: formData.get("category") as string,
    hue: formData.get("hue") as string,
    emoji: formData.get("emoji") as string,
    founded: formData.get("founded") as string,
    description: formData.get("description") as string,
    banner: formData.get("banner") as string,
    photo: (formData.get("photo") as string) || undefined,
  };

  if (!input.name?.trim()) return { error: "Club name is required" };
  if (!input.tagline?.trim()) return { error: "Tagline is required" };
  if (!input.category) return { error: "Category is required" };

  const result = await requestClubCreation(session.user.id, input);

  if (!result.ok) {
    return { error: result.message };
  }

  return { ok: true, message: "Club creation request submitted for faculty approval" };
}
