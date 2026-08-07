import { z } from "zod";
import { jsonError, jsonSuccess } from "@/backend/api/http";
import { resetPassword } from "@/backend/auth/password-reset";

const schema = z.object({
  token: z.string().min(1, "Missing reset token"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", { status: 400 });
  }

  const result = await resetPassword(parsed.data.token, parsed.data.password);
  if (!result.ok) {
    const status = result.code === "INVALID" ? 400 : 410;
    return jsonError(result.code, result.message, { status });
  }

  // No auto-login here, unlike email verification: this changes the password
  // on an existing, already-populated account rather than finishing a signup,
  // so requiring a normal sign-in afterward confirms the new password actually
  // works and doesn't hand a live session to anyone who merely had mail access.
  return jsonSuccess({ message: "Password updated. Sign in with your new password." }, { status: 200 });
}
