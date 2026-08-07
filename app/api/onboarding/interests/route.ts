import { z } from "zod";
import { getAppSession } from "@/backend/auth/app-session";
import { saveOnboardingInterests } from "@/backend/domain/membership";
import { INTEREST_OPTIONS } from "@/lib/interests";
import { jsonError, jsonSuccess } from "@/backend/api/http";

/** User Story 7.1 — Interest-Based Club Discovery */
const USER_STORY = "7.1";

const bodySchema = z.object({
  interests: z.array(z.enum(INTEREST_OPTIONS)).min(1, "Choose at least one interest").max(5, "Choose up to five interests"),
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

  const session = await getAppSession();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", { status: 401, userStory: USER_STORY });
  }

  try {
    await saveOnboardingInterests(session.user.id, parsed.data.interests);
    return jsonSuccess({ interests: parsed.data.interests }, { status: 200, userStory: USER_STORY });
  } catch (error) {
    console.error("[POST /api/onboarding/interests]", error);
    return jsonError("INTERNAL_ERROR", "Could not save interests. Please try again.", { status: 500, userStory: USER_STORY });
  }
}
