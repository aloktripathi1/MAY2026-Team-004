import { z } from "zod";
import { prisma } from "@/backend/db/prisma";
import { jsonError, jsonSuccess } from "@/backend/api/http";
import { sendVerificationEmail } from "@/backend/auth/email-verification";

/**
 * Re-issues a verification link. Without this, anyone whose link expired, went
 * to spam, or was sent while the allowlist blocked them is permanently locked
 * out once verification is required — with no self-service way back.
 *
 * Always answers 200 with the same body, whether or not the address has an
 * account. A different response for "no such user" would turn this into an
 * account-enumeration oracle, and unlike login there's no password here to
 * prove the caller already knows the account exists.
 */

const schema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address.") });

const ACCEPTED = "If that address has an unverified Sangam account, a new verification link is on its way.";

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
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  // Only unverified accounts get a fresh link. Re-sending to a verified one
  // would let anyone spam a known address with mail from us.
  if (user && !user.emailVerified) {
    await sendVerificationEmail(user);
  }

  return jsonSuccess({ message: ACCEPTED }, { status: 200 });
}
