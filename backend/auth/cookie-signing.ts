import crypto from "crypto";

// Falls back to a fixed dev-only secret so local development and CI don't
// require extra setup, but every deploy that actually handles real sessions
// (i.e. production) must set AUTH_SECRET or every signed cookie becomes
// forgeable by anyone who reads this file.
const DEV_FALLBACK_SECRET = "sangam-dev-only-insecure-secret";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production to sign session cookies.");
  }
  return DEV_FALLBACK_SECRET;
}

/** Signs `userId` so tampered cookie values can be detected and rejected. */
export function signSessionValue(userId: string): string {
  const signature = crypto.createHmac("sha256", getSecret()).update(userId).digest("hex");
  return `${userId}.${signature}`;
}

/** Verifies a signed session cookie value, returning the userId or null if missing/tampered. */
export function verifySessionValue(value: string | undefined | null): string | null {
  if (!value) return null;
  const separatorIndex = value.lastIndexOf(".");
  if (separatorIndex === -1) return null;

  const userId = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  if (!userId || !signature) return null;

  const expected = crypto.createHmac("sha256", getSecret()).update(userId).digest("hex");
  const provided = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(provided, expectedBuf)) return null;

  return userId;
}
