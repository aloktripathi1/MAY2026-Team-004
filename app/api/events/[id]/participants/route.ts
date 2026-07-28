import { getMockSession } from "@/backend/auth/mock-session";
import { listParticipants } from "@/backend/domain/events";
import { jsonError, jsonSuccess } from "@/backend/api/http";

/** User Story 2.3 — Participant List & Event Dashboard */
const USER_STORY = "2.3";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getMockSession();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", { status: 401, userStory: USER_STORY });
  }

  try {
    const result = await listParticipants(session.user.memberships, params.id);
    if (!result.ok) {
      const status = result.code === "FORBIDDEN" ? 403 : 404;
      return jsonError(result.code, result.message, { status, userStory: USER_STORY });
    }
    return jsonSuccess({ participants: result.participants }, { status: 200, userStory: USER_STORY });
  } catch (error) {
    console.error("[GET /api/events/[id]/participants]", error);
    return jsonError("INTERNAL_ERROR", "Could not load participants. Please try again.", { status: 500, userStory: USER_STORY });
  }
}
