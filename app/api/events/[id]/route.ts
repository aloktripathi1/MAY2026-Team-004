import { z } from "zod";
import { getAppSession } from "@/backend/auth/app-session";
import { getEventById, updateEvent } from "@/backend/domain/events";
import { jsonError, jsonSuccess } from "@/backend/api/http";

/** User Stories 2.5 (detail) / 2.2 (edit + schedule-change notification) */
const USER_STORY_DETAIL = "2.5";
const USER_STORY_EDIT = "2.2";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  time: z.string().min(1).optional(),
  venue: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  tags: z.string().optional(),
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const result = await getEventById(params.id);
    if (!result.ok) return jsonError(result.code, result.message, { status: 404, userStory: USER_STORY_DETAIL });
    return jsonSuccess({ event: result.event }, { status: 200, userStory: USER_STORY_DETAIL });
  } catch (error) {
    console.error("[GET /api/events/[id]]", error);
    return jsonError("INTERNAL_ERROR", "Could not load event. Please try again.", { status: 500, userStory: USER_STORY_DETAIL });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", { status: 400, userStory: USER_STORY_EDIT });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", {
      status: 400,
      details: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      userStory: USER_STORY_EDIT,
    });
  }

  const session = await getAppSession();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", { status: 401, userStory: USER_STORY_EDIT });
  }

  try {
    const result = await updateEvent(session.user.memberships, params.id, parsed.data);
    if (!result.ok) {
      const status = result.code === "EVENT_NOT_FOUND" ? 404 : 403;
      return jsonError(result.code, result.message, { status, userStory: USER_STORY_EDIT });
    }
    return jsonSuccess({ event: result.event }, { status: 200, userStory: USER_STORY_EDIT });
  } catch (error) {
    console.error("[PATCH /api/events/[id]]", error);
    return jsonError("INTERNAL_ERROR", "Could not update event. Please try again.", { status: 500, userStory: USER_STORY_EDIT });
  }
}
