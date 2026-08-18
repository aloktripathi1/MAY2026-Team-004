/**
 * Confirm / reject a signed Ask Sangam pending write.
 * Used by Server Actions and integration tests — session/HMAC gates stay in actions.ts.
 */
import { accessibleAppRoles, type AppRole } from "@/backend/auth/roles";
import { verifyPendingAction } from "@/backend/assistant/agent/pending-action";
import { toToolActor } from "@/backend/assistant/agent/run-write-agent";
import { executeTool } from "@/backend/assistant/tools/registry";
import type { AssistantAnswer, AssistantSessionUser } from "@/backend/domain/assistant-types";

export const REJECT_ANSWER = "Okay — I won't make that change.";

export type ConfirmWriteResult =
  | { ok: true; data: AssistantAnswer }
  | { ok: false; error: string };

export async function confirmPendingWrite(params: {
  user: AssistantSessionUser;
  decision: "accept" | "reject";
  token: string;
}): Promise<ConfirmWriteResult> {
  const { user, decision, token } = params;

  const preview = verifyPendingAction(token, {
    expectedUserId: user.id,
    consume: false,
  });

  if (!preview.ok) {
    const message =
      preview.reason === "expired"
        ? "That proposed action expired. Ask again to get a fresh confirmation."
        : preview.reason === "consumed"
          ? "That action was already applied."
          : preview.reason === "user_mismatch"
            ? "That proposed action does not belong to your session."
            : "Invalid or tampered action token.";
    return { ok: false, error: message };
  }

  if (decision === "reject") {
    verifyPendingAction(token, { expectedUserId: user.id, consume: true });
    return { ok: true, data: { answer: REJECT_ANSWER, sourceType: null } };
  }

  const scopedRole = preview.payload.role as AppRole | undefined;
  const actor = toToolActor(user, scopedRole);

  if (scopedRole && !accessibleAppRoles(user).includes(scopedRole)) {
    return { ok: false, error: "That proposed action does not match your current roles." };
  }

  // Claim the token synchronously, before the (slow, async) mutation — a second
  // concurrent Accept for the same token must lose the race here, not after
  // both requests have already executed the write.
  const verified = verifyPendingAction(token, { expectedUserId: user.id, consume: true });
  if (!verified.ok) {
    return { ok: false, error: "That action was already applied." };
  }

  try {
    const executed = await executeTool(verified.payload.toolName, actor, verified.payload.args);

    const sourceType =
      verified.payload.toolName === "propose_announcement" ? ("announcement" as const) : ("task" as const);

    return {
      ok: true,
      data: {
        answer: verified.payload.deferredNote
          ? `${executed.summary} You can confirm it on the related board. When you're ready, ask me to ${verified.payload.deferredNote}.`
          : `${executed.summary} You can confirm it on the related board.`,
        sourceType,
        sourceLabel: executed.sourceLabel,
        sourceHref: executed.sourceHref,
      },
    };
  } catch (error) {
    console.error("[confirmPendingWrite]", error);
    const message = error instanceof Error ? error.message : "Couldn't apply that change.";
    return { ok: false, error: message };
  }
}
