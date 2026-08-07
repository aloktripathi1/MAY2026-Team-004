import { z } from "zod";
import { getAppSession } from "@/backend/auth/app-session";
import { checkInAttendee } from "@/backend/domain/events";
import { jsonError, jsonSuccess } from "@/backend/api/http";

/** User Story 2.7 — RSVP and Attendance Check-in */
const USER_STORY = "2.7";

const bodySchema = z.object({
  countMeInId: z.string().min(1, "countMeInId is required"),
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

  const session = await getAppSession();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", { status: 401, userStory: USER_STORY });
  }

  try {
    const result = await checkInAttendee(session.user.memberships, params.id, parsed.data.countMeInId);
    if (!result.ok) {
      const status = result.code === "FORBIDDEN" ? 403 : 404;
      return jsonError(result.code, result.message, { status, userStory: USER_STORY });
    }
    return jsonSuccess({ countMeIn: result.countMeIn }, { status: 200, userStory: USER_STORY });
  } catch (error) {
    console.error("[POST /api/events/[id]/checkin]", error);
    return jsonError("INTERNAL_ERROR", "Could not check in attendee. Please try again.", { status: 500, userStory: USER_STORY });
  }
}
