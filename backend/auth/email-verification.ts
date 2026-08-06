import crypto from "crypto";
import { prisma } from "@/backend/db/prisma";
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
 * Off by default, and that default is deliberate rather than lazy: the gate is
 * only safe once verification email genuinely reaches new signups. While
 * `EMAIL_ALLOWLIST` is pinned during rollout, a student who signs up never
 * receives a link, so switching this on would lock every new account out of the
 * app with no way back in. Turn it on in the same change that clears the
 * allowlist — see "Requiring verified email" in the README.
 *
 * Accounts that predate verification are backfilled as verified by migration
 * 20260806..._backfill_email_verified, and prisma/seed.ts stamps the seeded
 * accounts, so enabling this never strands an existing login.
 */
export function requiresEmailVerification(): boolean {
  const flag = process.env.REQUIRE_EMAIL_VERIFICATION?.trim().toLowerCase();
  return flag === "true" || flag === "1";
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
