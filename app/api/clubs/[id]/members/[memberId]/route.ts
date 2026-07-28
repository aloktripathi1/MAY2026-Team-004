import { z } from "zod";
import { getMockSession } from "@/backend/auth/mock-session";
import { updateMembershipStatus } from "@/backend/domain/membership";
import { jsonError, jsonSuccess } from "@/backend/api/http";

/** User Story 1.4 — Membership Status Tracking */
const USER_STORY = "1.4";

const bodySchema = z.object({
  status: z.enum(["Active", "Pending", "Inactive"]),
});

export async function PATCH(request: Request, { params }: { params: { id: string; memberId: string } }) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", { status: 400, userStory: USER_STORY });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", {
      status: 400,
      details: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      userStory: USER_STORY,
    });
  }

  const session = await getMockSession();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", { status: 401, userStory: USER_STORY });
  }

  try {
    const result = await updateMembershipStatus(session.user.memberships, params.memberId, parsed.data.status);
    if (!result.ok) {
      const status = result.code === "MEMBERSHIP_NOT_FOUND" ? 404 : result.code === "FORBIDDEN" ? 403 : 400;
      return jsonError(result.code, result.message, { status, userStory: USER_STORY });
    }
    return jsonSuccess({ membership: result.membership }, { status: 200, userStory: USER_STORY });
  } catch (error) {
    console.error("[PATCH /api/clubs/[id]/members/[memberId]]", error);
    return jsonError("INTERNAL_ERROR", "Could not update membership status. Please try again.", { status: 500, userStory: USER_STORY });
  }
}
