import { jsonError } from "@/backend/api/http";

const USER_STORY = "Ask Sangam";

/**
 * Client-facing assistant HTTP routes are retired. Confirm via
 * `askSangamConfirmAction` only.
 */
export async function POST() {
  return jsonError(
    "GONE",
    "Ask Sangam confirm is only available through Server Actions.",
    { status: 410, userStory: USER_STORY },
  );
}
