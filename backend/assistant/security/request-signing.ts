import crypto from "crypto";

const DEV_FALLBACK_SECRET = "sangam-dev-only-assistant-action-secret";

function getActionSecret(): string {
  const secret = process.env.ASSISTANT_ACTION_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ASSISTANT_ACTION_SECRET (or AUTH_SECRET) must be set in production.");
  }
  return DEV_FALLBACK_SECRET;
}

export type AssistantRequestEnvelope = {
  /** Canonical JSON body that was signed. */
  body: string;
  /** HMAC-SHA256 of body (base64url). */
  signature: string;
};

/** Sign a canonical JSON string for an assistant Server Action request. */
export function signAssistantRequestBody(canonicalBody: string): AssistantRequestEnvelope {
  const signature = crypto.createHmac("sha256", getActionSecret()).update(canonicalBody).digest("base64url");
  return { body: canonicalBody, signature };
}

/**
 * Verify an assistant request envelope. Returns the parsed JSON on success.
 * Used by Server Actions before any domain / agent work.
 */
export function verifyAssistantRequestBody(
  envelope: AssistantRequestEnvelope,
): { ok: true; payload: unknown } | { ok: false; reason: "invalid" } {
  if (!envelope?.body || !envelope?.signature) return { ok: false, reason: "invalid" };

  const expected = crypto.createHmac("sha256", getActionSecret()).update(envelope.body).digest("base64url");
  const provided = Buffer.from(envelope.signature);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length || !crypto.timingSafeEqual(provided, expectedBuf)) {
    return { ok: false, reason: "invalid" };
  }

  try {
    return { ok: true, payload: JSON.parse(envelope.body) as unknown };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/** Build a stable canonical JSON string for signing (sorted keys at top level). */
export function canonicalizeAssistantPayload(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload).sort();
  const ordered: Record<string, unknown> = {};
  for (const key of keys) ordered[key] = payload[key];
  return JSON.stringify(ordered);
}
