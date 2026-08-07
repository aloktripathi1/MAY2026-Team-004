"use server";

import { z } from "zod";
import { getAppSession } from "@/backend/auth/app-session";
import {
  accessibleAppRoles,
  type AppRole,
} from "@/backend/auth/roles";
import { confirmPendingWrite } from "@/backend/assistant/confirm-pending-write";
import {
  canonicalizeAssistantPayload,
  signAssistantRequestBody,
  verifyAssistantRequestBody,
} from "@/backend/assistant/security/request-signing";
import { answerAssistantQuery } from "@/backend/domain/assistant";
import type { AssistantAnswer } from "@/backend/domain/assistant-types";

const appRoleSchema = z.enum(["member", "coordinator", "admin", "volunteer", "faculty"]);

const queryInputSchema = z.object({
  query: z.string().trim().min(1, "Ask something first.").max(500, "Keep it under 500 characters."),
  role: appRoleSchema,
});

const confirmInputSchema = z.object({
  decision: z.enum(["accept", "reject"]),
  token: z.string().min(1, "Missing action token."),
});

export type AskSangamActionResult =
  | { ok: true; data: AssistantAnswer }
  | { ok: false; error: string };

function signAndVerify(payload: Record<string, unknown>): AskSangamActionResult | null {
  const canonical = canonicalizeAssistantPayload(payload);
  const envelope = signAssistantRequestBody(canonical);
  const verified = verifyAssistantRequestBody(envelope);
  if (!verified.ok) {
    return { ok: false, error: "Request signature verification failed." };
  }
  return null;
}

/**
 * Ask Sangam query entry — session + shell role + HMAC request gate, then domain.
 * Client must not call /api/assistant/* directly.
 */
export async function askSangamQueryAction(input: {
  query: string;
  role: AppRole;
}): Promise<AskSangamActionResult> {
  const session = await getAppSession();
  if (!session?.user) {
    return { ok: false, error: "Authentication required." };
  }

  const parsed = queryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const allowed = accessibleAppRoles(session.user);
  if (!allowed.includes(parsed.data.role)) {
    return { ok: false, error: "That role is not available for your account." };
  }

  const gate = signAndVerify({
    kind: "query",
    userId: session.user.id,
    role: parsed.data.role,
    query: parsed.data.query,
  });
  if (gate) return gate;

  try {
    const data = await answerAssistantQuery(
      {
        id: session.user.id,
        isFaculty: session.user.isFaculty,
        memberships: session.user.memberships,
      },
      parsed.data.query,
      { activeRole: parsed.data.role },
    );
    return { ok: true, data };
  } catch (error) {
    console.error("[askSangamQueryAction]", error);
    return { ok: false, error: "Ask Sangam couldn't answer that just now. Please try again." };
  }
}

/**
 * Accept / Reject a signed pending write. Requires a signed-in session.
 */
export async function askSangamConfirmAction(input: {
  decision: "accept" | "reject";
  token: string;
}): Promise<AskSangamActionResult> {
  const session = await getAppSession();
  if (!session?.user) {
    return { ok: false, error: "Authentication required." };
  }

  const parsed = confirmInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const gate = signAndVerify({
    kind: "confirm",
    userId: session.user.id,
    decision: parsed.data.decision,
    token: parsed.data.token,
  });
  if (gate) return gate;

  return confirmPendingWrite({
    user: {
      id: session.user.id,
      isFaculty: session.user.isFaculty,
      memberships: session.user.memberships,
    },
    decision: parsed.data.decision,
    token: parsed.data.token,
  });
}
