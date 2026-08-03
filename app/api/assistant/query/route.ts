import { z } from "zod";
import { getMockSession } from "@/backend/auth/mock-session";
import { answerAssistantQuery } from "@/backend/domain/assistant";
import { jsonError, jsonSuccess } from "@/backend/api/http";

const USER_STORY = "Ask Sangam";

const querySchema = z.object({
  query: z.string().trim().min(1, "Ask something first.").max(500, "Keep it under 500 characters."),
});

export async function POST(request: Request) {
  const session = await getMockSession();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", { status: 401, userStory: USER_STORY });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", { status: 400, userStory: USER_STORY });
  }

  const parsed = querySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", {
      status: 400,
      details: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      userStory: USER_STORY,
    });
  }

  try {
    const result = await answerAssistantQuery(
      { id: session.user.id, isFaculty: session.user.isFaculty, memberships: session.user.memberships },
      parsed.data.query,
    );
    return jsonSuccess(result, { status: 200, userStory: USER_STORY });
  } catch (error) {
    console.error("[POST /api/assistant/query]", error);
    return jsonError("INTERNAL_ERROR", "Ask Sangam couldn't answer that just now. Please try again.", {
      status: 500,
      userStory: USER_STORY,
    });
  }
}
