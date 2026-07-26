import { getMockSession } from "@/backend/auth/mock-session";
import { registerForEvent } from "@/backend/domain/events";
import { jsonError, jsonSuccess } from "@/backend/api/http";

/** User Story 2.1 — Event Creation & Registration (RSVP / Count Me In) */
const USER_STORY = "2.1";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = getMockSession();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", { status: 401, userStory: USER_STORY });
  }

  try {
    const result = await registerForEvent(session.user.id, params.id);
    if (!result.ok) {
      const status = result.code === "EVENT_NOT_FOUND" ? 404 : result.code === "REGISTRATION_LOCKED" ? 409 : 400;
      return jsonError(result.code, result.message, { status, userStory: USER_STORY });
    }
    return jsonSuccess({ action: result.action }, { status: 200, userStory: USER_STORY });
  } catch (error) {
    console.error("[POST /api/events/[id]/register]", error);
    return jsonError("INTERNAL_ERROR", "Could not update registration. Please try again.", { status: 500, userStory: USER_STORY });
  }
}
