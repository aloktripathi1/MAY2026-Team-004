import { getMockSession } from "@/backend/auth/mock-session";
import { applyToJoinClub, listClubMembers } from "@/backend/domain/membership";
import { requireClubAdminAccess } from "@/backend/domain/workflow-rules";
import { jsonError, jsonSuccess } from "@/backend/api/http";

/** User Stories 1.2 (member directory) / 1.3 (single-portal registration) */
const USER_STORY_LIST = "1.2";
const USER_STORY_JOIN = "1.3";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = getMockSession();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", { status: 401, userStory: USER_STORY_LIST });
  }

  try {
    requireClubAdminAccess(session.user.memberships, params.id);
  } catch {
    return jsonError("FORBIDDEN", "Not authorized for this club.", { status: 403, userStory: USER_STORY_LIST });
  }

  try {
    const result = await listClubMembers(params.id);
    if (!result.ok) return jsonError(result.code, result.message, { status: 404, userStory: USER_STORY_LIST });
    return jsonSuccess({ members: result.members }, { status: 200, userStory: USER_STORY_LIST });
  } catch (error) {
    console.error("[GET /api/clubs/[id]/members]", error);
    return jsonError("INTERNAL_ERROR", "Could not load members. Please try again.", { status: 500, userStory: USER_STORY_LIST });
  }
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = getMockSession();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", { status: 401, userStory: USER_STORY_JOIN });
  }

  try {
    const result = await applyToJoinClub(session.user.id, params.id);
    if (!result.ok) {
      const status = result.code === "CLUB_NOT_FOUND" ? 404 : 409;
      return jsonError(result.code, result.message, { status, userStory: USER_STORY_JOIN });
    }
    return jsonSuccess({ membership: result.membership }, { status: 201, userStory: USER_STORY_JOIN });
  } catch (error) {
    console.error("[POST /api/clubs/[id]/members]", error);
    return jsonError("INTERNAL_ERROR", "Could not submit join request. Please try again.", { status: 500, userStory: USER_STORY_JOIN });
  }
}
