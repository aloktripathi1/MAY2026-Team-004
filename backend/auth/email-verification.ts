import crypto from "crypto";
import { prisma } from "@/backend/db/prisma";
import { getEmailConfig } from "@/backend/email/config";
import { notifyEmailVerification } from "@/backend/email/notifications";

/**
 * Signup email verification (#113). Only a SHA-256 hash of each token is
 * stored, so the table is useless to anyone who reads it — the raw token exists
 * only in the email we send.
 *
 * Verification is deliberately not enforced at login. Turning it into a gate
 * would lock out every account that predates this feature, including the seeded
 * demo logins the integration suite signs in with. `User.emailVerified` records
 * the fact; gating on it is a separate product decision.
 */

export const VERIFICATION_TTL_HOURS = 24;

/**
 * Whether an unverified account is refused sign-in.
 *
 * **On by default.** Set `REQUIRE_EMAIL_VERIFICATION=false` to disable it.
 *
 * The one hard precondition is that the app can actually deliver the link. If
 * email is not enabled, requiring verification would refuse everyone with no way
 * to comply — locking the whole app, including the person trying to configure it.
 * So the gate is inert whenever `getEmailConfig().enabled` is false: locally and
 * in tests it never fires, and in production it fires as soon as email works.
 *
 * That leaves nothing to remember. Verification mail is transactional, so it is
 * exempt from `EMAIL_ALLOWLIST` (see sendEmail) and reaches a new signup even
 * mid-rollout; the link's origin falls back to the request host if `APP_URL` is
 * stale (see getEmailConfig); and accounts predating the feature are recognised
 * by never having been issued a token (see authenticate-user.ts) rather than by
 * a migration having run.
 */
export function requiresEmailVerification(): boolean {
  const flag = process.env.REQUIRE_EMAIL_VERIFICATION?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;

  // No way to send the link means no way to satisfy the gate.
  return getEmailConfig().enabled;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Issues a fresh token, invalidating any unused ones for that user. */
export async function createVerificationToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

  // Only one live link per user: re-requesting verification must retire the
  // previous email's link rather than leaving several valid at once.
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId, consumedAt: null } }),
    prisma.emailVerificationToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt },
    }),
  ]);

  return token;
}

export type VerifyResult =
  | { ok: true; userId: string; alreadyVerified: boolean }
  | { ok: false; code: "INVALID" | "EXPIRED" | "USED"; message: string };

/** Consumes a token and stamps `User.emailVerified`. Single use. */
export async function consumeVerificationToken(token: string | null | undefined): Promise<VerifyResult> {
  if (!token) return { ok: false, code: "INVALID", message: "This verification link is not valid." };

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, emailVerified: true } } },
  });
  if (!record) return { ok: false, code: "INVALID", message: "This verification link is not valid." };
  if (record.consumedAt) {
    return { ok: false, code: "USED", message: "This verification link has already been used." };
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, code: "EXPIRED", message: "This verification link has expired. Request a new one." };
  }

  const alreadyVerified = Boolean(record.user.emailVerified);

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    ...(alreadyVerified
      ? []
      : [prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } })]),
  ]);

  return { ok: true, userId: record.userId, alreadyVerified };
}

/**
 * Issues a token and mails it. Best-effort: a signup must still succeed if the
 * mail provider is down, so failures are logged rather than thrown.
 */
export async function sendVerificationEmail(user: { id: string; name: string; email: string }): Promise<void> {
  try {
    const token = await createVerificationToken(user.id);
    await notifyEmailVerification(user, token, VERIFICATION_TTL_HOURS);
  } catch (error) {
    console.error("[email] could not send verification email", error);
  }
}
