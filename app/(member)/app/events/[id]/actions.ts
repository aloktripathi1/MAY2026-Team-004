"use server";

import { toggleCountMeInAction as sharedToggleCountMeInAction } from "@/lib/actions/countMeIn";

export async function toggleCountMeInAction(eventId: string, eventSlug: string) {
  return sharedToggleCountMeInAction(eventId, eventSlug);
}
