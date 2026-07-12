"use server";

import { toggleRsvpAction as sharedToggleRsvpAction } from "@/lib/actions/rsvp";

export async function toggleRsvpAction(eventId: string, eventSlug: string) {
  return sharedToggleRsvpAction(eventId, eventSlug);
}
