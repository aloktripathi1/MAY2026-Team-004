import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "@/backend/db/prisma";
import { notifyPasswordReset } from "@/backend/email/notifications";

/**
 * "Forgot password" links (#auth-flow-improvements). Only a SHA-256 hash of
 * each token is stored — same reasoning as email-verification.ts.
 *
 * Deliberately shorter-lived than the signup verification link: a reset link
 * grants control of an existing, already-populated account rather than
 * finishing a signup, so a narrower exposure window matters more here.
 */

export const RESET_TTL_HOURS = 1;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Issues a fresh reset token, invalidating any unused ones for that user. */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TTL_HOURS * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, consumedAt: null } }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt },
    }),
  ]);

  return token;
}

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; code: "INVALID" | "EXPIRED" | "USED"; message: string };

/**
 * Validates a reset token and, if it's still live, updates the password and
 * consumes the token in one transaction — the token is only ever burned
 * together with an actual password change, never on its own, so a page load
 * that never gets submitted can't waste the link.
 */
export async function resetPassword(token: string | null | undefined, newPassword: string): Promise<ResetPasswordResult> {
  if (!token) return { ok: false, code: "INVALID", message: "This reset link is not valid." };

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record) return { ok: false, code: "INVALID", message: "This reset link is not valid." };
  if (record.consumedAt) {
    return { ok: false, code: "USED", message: "This reset link has already been used." };
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, code: "EXPIRED", message: "This reset link has expired. Request a new one." };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { hashedPassword } }),
  ]);

  return { ok: true };
}

/**
 * Issues a token and mails it. Best-effort, like sendVerificationEmail: a
 * broken mail provider must not surface as an error to the caller — the
 * enumeration-safe forgot-password route always answers the same either way.
 */
export async function sendPasswordResetEmail(user: { id: string; name: string; email: string }): Promise<void> {
  try {
    const token = await createPasswordResetToken(user.id);
    await notifyPasswordReset(user, token, RESET_TTL_HOURS);
  } catch (error) {
    console.error("[email] could not send password reset email", error);
  }
}
