import crypto from "crypto";
import { EMAIL_PREF_KEYS, type EmailCategory } from "@/lib/notification-prefs";
import { absoluteUrl } from "@/backend/email/config";

/**
 * Signed opt-out links. A recipient must be able to stop email without logging
 * in — that's both a deliverability requirement (Gmail and Yahoo want a working
 * List-Unsubscribe) and the honest thing to do. So the link carries the user id
 * and category in a token this app signs, rather than a session.
 *
 * Reuses the AUTH_SECRET convention from backend/auth/cookie-signing.ts. Tokens
 * intentionally never expire: an unsubscribe link buried in a year-old email
 * must still work.
 */

const DEV_FALLBACK_SECRET = "sangam-dev-only-insecure-secret";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production to sign unsubscribe links.");
  }
  return DEV_FALLBACK_SECRET;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export type UnsubscribePayload = { userId: string; category: EmailCategory };

export function createUnsubscribeToken({ userId, category }: UnsubscribePayload): string {
  const payload = Buffer.from(`${userId}:${category}`, "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyUnsubscribeToken(token: string | null | undefined): UnsubscribePayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const provided = Buffer.from(signature);
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  const separator = decoded.lastIndexOf(":");
  if (separator === -1) return null;

  const userId = decoded.slice(0, separator);
  const category = decoded.slice(separator + 1);
  if (!userId || !(category in EMAIL_PREF_KEYS)) return null;

  return { userId, category: category as EmailCategory };
}

/** The footer link recipients click to stop a given category of email. */
export function unsubscribeUrl(payload: UnsubscribePayload, appUrl?: string): string {
  const token = createUnsubscribeToken(payload);
  return absoluteUrl(`/api/email/unsubscribe?token=${encodeURIComponent(token)}`, appUrl);
}
