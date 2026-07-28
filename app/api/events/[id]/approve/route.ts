import { z } from "zod";
import { getMockSession } from "@/backend/auth/mock-session";
import { setEventApprovalByFaculty } from "@/backend/domain/events";
import { jsonError, jsonSuccess } from "@/backend/api/http";

/** User Story 2.8 — Faculty Approval for Events */
const USER_STORY = "2.8";

const bodySchema = z.object({
  approval: z.enum(["approved", "pending", "rejected"]),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
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
    const result = await setEventApprovalByFaculty(session.user.isFaculty, params.id, parsed.data.approval);
    if (!result.ok) {
      const status = result.code === "FORBIDDEN" ? 403 : 404;
      return jsonError(result.code, result.message, { status, userStory: USER_STORY });
    }
    return jsonSuccess({ event: result.event }, { status: 200, userStory: USER_STORY });
  } catch (error) {
    console.error("[POST /api/events/[id]/approve]", error);
    return jsonError("INTERNAL_ERROR", "Could not update approval. Please try again.", { status: 500, userStory: USER_STORY });
  }
}
