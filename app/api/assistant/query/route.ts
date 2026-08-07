import { jsonError } from "@/backend/api/http";

const USER_STORY = "Ask Sangam";

/**
 * Client-facing assistant HTTP routes are retired. Ask Sangam uses Server
 * Actions (`askSangamQueryAction` / `askSangamConfirmAction`) only.
 */
export async function POST() {
  return jsonError(
    "GONE",
    "Ask Sangam no longer accepts client HTTP calls. Use the in-app assistant (Server Actions).",
    { status: 410, userStory: USER_STORY },
  );
}
