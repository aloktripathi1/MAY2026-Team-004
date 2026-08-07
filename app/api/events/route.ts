import { z } from "zod";
import { getAppSession } from "@/backend/auth/app-session";
import { createEvent, listEvents } from "@/backend/domain/events";
import { jsonError, jsonSuccess } from "@/backend/api/http";

/** User Stories 2.1 (create) / 2.5 (listing) */
const USER_STORY_CREATE = "2.1";
const USER_STORY_LIST = "2.5";

const createSchema = z.object({
  clubId: z.string().min(1, "clubId is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  venue: z.string().min(1, "Venue is required"),
  capacity: z.number().int().positive(),
  tags: z.string().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clubId = searchParams.get("clubId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  try {
    const events = await listEvents({ clubId, status });
    return jsonSuccess({ events }, { status: 200, userStory: USER_STORY_LIST });
  } catch (error) {
    console.error("[GET /api/events]", error);
    return jsonError("INTERNAL_ERROR", "Could not load events. Please try again.", { status: 500, userStory: USER_STORY_LIST });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", { status: 400, userStory: USER_STORY_CREATE });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", {
      status: 400,
      details: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      userStory: USER_STORY_CREATE,
    });
  }

  const session = await getAppSession();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", { status: 401, userStory: USER_STORY_CREATE });
  }

  try {
    const { clubId, ...input } = parsed.data;
    const result = await createEvent(session.user.memberships, clubId, input);
    if (!result.ok) {
      const status = result.code === "CLUB_NOT_FOUND" ? 404 : 403;
      return jsonError(result.code, result.message, { status, userStory: USER_STORY_CREATE });
    }
    return jsonSuccess({ event: result.event }, { status: 201, userStory: USER_STORY_CREATE });
  } catch (error) {
    console.error("[POST /api/events]", error);
    return jsonError("INTERNAL_ERROR", "Could not create event. Please try again.", { status: 500, userStory: USER_STORY_CREATE });
  }
}
