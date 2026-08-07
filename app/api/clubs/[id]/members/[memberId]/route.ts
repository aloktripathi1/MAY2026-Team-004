import { z } from "zod";
import { getMockSession } from "@/backend/auth/mock-session";
import { updateMembershipRole, updateMembershipStatus } from "@/backend/domain/membership";
import { jsonError, jsonSuccess } from "@/backend/api/http";

/** User Story 1.4 — Membership Status Tracking */
const USER_STORY = "1.4";

/**
 * Either field may be sent, and at least one must be. `role` excludes Admin on
 * purpose — a club has exactly one Admin and /admin/handover owns that move,
 * demoting the outgoing Admin in the same transaction.
 */
const bodySchema = z
  .object({
    status: z.enum(["Active", "Pending", "Inactive"]).optional(),
    role: z.enum(["Member", "Volunteer", "Coordinator"]).optional(),
  })
  .refine((body) => body.status !== undefined || body.role !== undefined, {
    message: "Provide a status, a role, or both.",
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

  const httpStatusFor = (code: string) =>
    code === "MEMBERSHIP_NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : 400;

  try {
    let membership;

    if (parsed.data.status !== undefined) {
      const result = await updateMembershipStatus(session.user.memberships, params.memberId, parsed.data.status);
      if (!result.ok) {
        return jsonError(result.code, result.message, { status: httpStatusFor(result.code), userStory: USER_STORY });
      }
      membership = result.membership;
    }

    if (parsed.data.role !== undefined) {
      const result = await updateMembershipRole(session.user.memberships, params.memberId, parsed.data.role);
      if (!result.ok) {
        return jsonError(result.code, result.message, { status: httpStatusFor(result.code), userStory: USER_STORY });
      }
      membership = result.membership;
    }

    return jsonSuccess({ membership }, { status: 200, userStory: USER_STORY });
  } catch (error) {
    console.error("[PATCH /api/clubs/[id]/members/[memberId]]", error);
    return jsonError("INTERNAL_ERROR", "Could not update the membership. Please try again.", { status: 500, userStory: USER_STORY });
  }
}
