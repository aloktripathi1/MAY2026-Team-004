import { z } from "zod";
import { prisma } from "@/backend/db/prisma";
import { jsonError, jsonSuccess } from "@/backend/api/http";
import { sendPasswordResetEmail } from "@/backend/auth/password-reset";

/**
 * Issues a "forgot password" link. Always answers 200 with the same body,
 * whether or not the address has an account — the same enumeration-safe shape
 * as /api/auth/resend-verification, and for the same reason: a different
 * response for "no such user" turns this into an account-discovery oracle.
 */

const schema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address.") });

const ACCEPTED = "If that address has a Sangam account, a password reset link is on its way.";

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

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true, email: true },
  });

  if (user) {
    await sendPasswordResetEmail(user);
  }

  return jsonSuccess({ message: ACCEPTED }, { status: 200 });
}
