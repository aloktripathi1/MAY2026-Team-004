import { setAuthCookies } from "@/backend/auth/session-cookies";
import { createUserAccount } from "@/backend/auth/create-user";
import { signupSchema } from "@/backend/auth/signup-schema";
import { requiresEmailVerification } from "@/backend/auth/email-verification";
import { jsonError, jsonSuccess } from "@/backend/api/http";

/** User Story 1.1 — Institutional Credential Verification */
const USER_STORY = "1.1";

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

  const parsed = signupSchema.safeParse(body);
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

  try {
    const result = await createUserAccount(parsed.data);
    if (!result.ok) {
      return jsonError(result.code, result.message, {
        status: 409,
        userStory: USER_STORY,
      });
    }

    // No session until the address is confirmed, when verification is required
    // — otherwise the emailed link is decoration.
    const verificationRequired = requiresEmailVerification();
    if (!verificationRequired) {
      setAuthCookies(result.user.id);
    }

    return jsonSuccess(
      {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        rollNumber: result.user.rollNumber,
        emailVerificationRequired: verificationRequired,
        next: verificationRequired ? "/login?verify=sent" : "/signup/onboarding",
      },
      { status: 201, userStory: USER_STORY },
    );
  } catch (error) {
    console.error("[POST /api/auth/signup]", error);
    return jsonError("INTERNAL_ERROR", "Could not create account. Please try again.", {
      status: 500,
      userStory: USER_STORY,
    });
  }
}
