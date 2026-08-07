import { setAuthCookies } from "@/backend/auth/session-cookies";
import { authenticateUser } from "@/backend/auth/authenticate-user";
import { loginSchema, safeRedirectPath } from "@/backend/auth/login-schema";
import { jsonError, jsonSuccess } from "@/backend/api/http";
import { homePathForUser } from "@/backend/auth/roles";

/** User Story 1.1 — Institutional Credential Verification */
const USER_STORY = "1.1";

/** Generic message — does not reveal whether email or password failed. */
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", {
      status: 400,
      userStory: USER_STORY,
    });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", {
      status: 400,
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
      userStory: USER_STORY,
    });
  }

  const { email, password, callbackUrl } = parsed.data;

  try {
    const result = await authenticateUser(email, password);
    if (!result.ok) {
      // Distinct from bad credentials: the password was correct, so saying the
      // address is unverified reveals nothing, and a generic "invalid email or
      // password" here would send people to reset a password that works.
      if (result.code === "EMAIL_UNVERIFIED") {
        return jsonError("EMAIL_UNVERIFIED", result.message, {
          status: 403,
          userStory: USER_STORY,
        });
      }
      return jsonError("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE, {
        status: 401,
        userStory: USER_STORY,
      });
    }

    setAuthCookies(result.user.id);

    const roleHome = homePathForUser({
      isFaculty: result.user.isFaculty,
      memberships: result.user.memberships,
    });

    return jsonSuccess(
      {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        rollNumber: result.user.rollNumber,
        isFaculty: result.user.isFaculty,
        memberships: result.user.memberships,
        next: safeRedirectPath(callbackUrl, roleHome),
      },
      { status: 200, userStory: USER_STORY },
    );
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return jsonError("INTERNAL_ERROR", "Could not sign in. Please try again.", {
      status: 500,
      userStory: USER_STORY,
    });
  }
}
