import { z } from "zod";
import { getMockSession } from "@/backend/auth/mock-session";
import { bulkImportMembers } from "@/backend/domain/membership";
import { requireClubAdminAccess } from "@/backend/domain/workflow-rules";
import { jsonError, jsonSuccess } from "@/backend/api/http";

/** User Story 1.5 — Bulk Member Import */
const USER_STORY = "1.5";

const rowSchema = z.object({
  name: z.string().min(1),
  roll: z.string().min(1),
  email: z.string().email(),
  role: z.string().optional(),
});

const bodySchema = z.object({
  clubId: z.string().min(1, "clubId is required"),
  rows: z.array(rowSchema).min(1, "At least one row is required").max(500, "At most 500 rows per import"),
});

export async function POST(request: Request) {
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
    requireClubAdminAccess(session.user.memberships, parsed.data.clubId);
  } catch {
    return jsonError("FORBIDDEN", "Not authorized for this club.", { status: 403, userStory: USER_STORY });
  }

  try {
    const result = await bulkImportMembers(parsed.data.clubId, parsed.data.rows);
    if (!result.ok) {
      return jsonError(result.code, result.message, { status: 404, userStory: USER_STORY });
    }
    return jsonSuccess({ imported: result.imported, skipped: result.skipped }, { status: 200, userStory: USER_STORY });
  } catch (error) {
    console.error("[POST /api/members/bulk-import]", error);
    return jsonError("INTERNAL_ERROR", "Could not import members. Please try again.", { status: 500, userStory: USER_STORY });
  }
}
