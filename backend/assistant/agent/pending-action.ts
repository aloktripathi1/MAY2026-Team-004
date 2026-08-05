import crypto from "crypto";

const DEV_FALLBACK_SECRET = "sangam-dev-only-insecure-secret";
const DEFAULT_TTL_MS = 10 * 60 * 1000;

/** Best-effort one-time use within a single server process (v1 — no durable store). */
const consumedTokens = new Set<string>();

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production to sign pending assistant actions.");
  }
  return DEV_FALLBACK_SECRET;
}

export type PendingActionPayload = {
  userId: string;
  toolName: string;
  args: Record<string, unknown>;
  exp: number;
};

function encodePayload(payload: PendingActionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(encoded: string): PendingActionPayload | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as PendingActionPayload;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.toolName !== "string" ||
      typeof parsed.exp !== "number" ||
      typeof parsed.args !== "object" ||
      parsed.args === null ||
      Array.isArray(parsed.args)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function signBody(body: string): string {
  return crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
}

/** Sign a pending write so the client can Accept/Reject without a DB row. */
export function signPendingAction(
  payload: Omit<PendingActionPayload, "exp">,
  ttlMs = DEFAULT_TTL_MS,
): string {
  const full: PendingActionPayload = {
    ...payload,
    exp: Date.now() + ttlMs,
  };
  const body = encodePayload(full);
  return `${body}.${signBody(body)}`;
}

export type VerifyPendingResult =
  | { ok: true; payload: PendingActionPayload }
  | { ok: false; reason: "invalid" | "expired" | "consumed" | "user_mismatch" };

/**
 * Verify signature, expiry, optional user match, and best-effort one-time use.
 * On success with `consume: true`, marks the token used for this process.
 */
export function verifyPendingAction(
  token: string,
  options: { expectedUserId: string; consume?: boolean },
): VerifyPendingResult {
  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex === -1) return { ok: false, reason: "invalid" };

  const body = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  if (!body || !signature) return { ok: false, reason: "invalid" };

  const expected = signBody(body);
  const provided = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length || !crypto.timingSafeEqual(provided, expectedBuf)) {
    return { ok: false, reason: "invalid" };
  }

  const payload = decodePayload(body);
  if (!payload) return { ok: false, reason: "invalid" };
  if (payload.exp < Date.now()) return { ok: false, reason: "expired" };
  if (payload.userId !== options.expectedUserId) return { ok: false, reason: "user_mismatch" };
  if (consumedTokens.has(token)) return { ok: false, reason: "consumed" };

  if (options.consume) {
    consumedTokens.add(token);
  }

  return { ok: true, payload };
}

/** Test helper — clear the in-memory consumed set. */
export function clearConsumedPendingActionsForTests() {
  consumedTokens.clear();
}
