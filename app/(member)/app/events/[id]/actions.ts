"use server";

import { toggleCountMeInAction as sharedToggleCountMeInAction } from "@/backend/domain/countMeIn";

export async function toggleCountMeInAction(eventId: string, eventSlug: string) {
  return sharedToggleCountMeInAction(eventId, eventSlug);
}
