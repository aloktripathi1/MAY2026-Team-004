import { checkEventConflicts } from "@/backend/domain/events";
import { jsonError, jsonSuccess } from "@/backend/api/http";

/** User Story 2.4 — Conflict-Checked Scheduling */
const USER_STORY = "2.4";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const venue = searchParams.get("venue");
  const excludeEventId = searchParams.get("excludeEventId") ?? undefined;

  if (!date || !venue) {
    return jsonError("VALIDATION_ERROR", "Both date and venue query params are required.", {
      status: 400,
      userStory: USER_STORY,
    });
  }

  try {
    const conflicts = await checkEventConflicts(date, venue, excludeEventId);
    return jsonSuccess({ conflicts, hasConflict: conflicts.length > 0 }, { status: 200, userStory: USER_STORY });
  } catch (error) {
    console.error("[GET /api/events/conflicts]", error);
    return jsonError("INTERNAL_ERROR", "Could not check conflicts. Please try again.", { status: 500, userStory: USER_STORY });
  }
}
