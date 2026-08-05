import { z } from "zod";
import { getMockSession } from "@/backend/auth/mock-session";
import { membershipsForAppRole, type AppRole } from "@/backend/auth/roles";
import { verifyPendingAction } from "@/backend/assistant/agent/pending-action";
import { executeTool } from "@/backend/assistant/tools/registry";
import type { AssistantAnswer } from "@/backend/domain/assistant-types";
import { jsonError, jsonSuccess } from "@/backend/api/http";

const USER_STORY = "Ask Sangam";

const REJECT_ANSWER = "Okay — I won't make that change.";

const confirmSchema = z.object({
  decision: z.enum(["accept", "reject"]),
  token: z.string().min(1, "Missing action token."),
});

export async function POST(request: Request) {
  const session = await getMockSession();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", { status: 401, userStory: USER_STORY });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", { status: 400, userStory: USER_STORY });
  }

  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", {
      status: 400,
      details: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      userStory: USER_STORY,
    });
  }

  const { decision, token } = parsed.data;
  const verified = verifyPendingAction(token, {
    expectedUserId: session.user.id,
    consume: false,
  });

  if (!verified.ok) {
    const message =
      verified.reason === "expired"
        ? "That proposed action expired. Ask again to get a fresh confirmation."
        : verified.reason === "consumed"
          ? "That action was already applied."
          : verified.reason === "user_mismatch"
            ? "That proposed action does not belong to your session."
            : "Invalid or tampered action token.";
    return jsonError("INVALID_TOKEN", message, { status: 400, userStory: USER_STORY });
  }

  if (decision === "reject") {
    verifyPendingAction(token, { expectedUserId: session.user.id, consume: true });
    const result: AssistantAnswer = {
      answer: REJECT_ANSWER,
      sourceType: null,
    };
    return jsonSuccess(result, { status: 200, userStory: USER_STORY });
  }

  // Re-apply the shell scope the proposal was signed with, so accepting can
  // never execute with wider capabilities than the user was offered.
  const scopedRole = verified.payload.role as AppRole | undefined;

  try {
    const executed = await executeTool(verified.payload.toolName, {
      id: session.user.id,
      isFaculty: scopedRole ? scopedRole === "faculty" && session.user.isFaculty : session.user.isFaculty,
      memberships: scopedRole
        ? membershipsForAppRole(session.user.memberships, scopedRole)
        : session.user.memberships,
    }, verified.payload.args);

    verifyPendingAction(token, { expectedUserId: session.user.id, consume: true });

    const result: AssistantAnswer = {
      answer: `${executed.summary} You can confirm it on your task board.`,
      sourceType: "task",
      sourceLabel: executed.sourceLabel,
      sourceHref: executed.sourceHref,
    };
    return jsonSuccess(result, { status: 200, userStory: USER_STORY });
  } catch (error) {
    console.error("[POST /api/assistant/confirm]", error);
    const message = error instanceof Error ? error.message : "Couldn't apply that change.";
    return jsonError("ACTION_FAILED", message, { status: 400, userStory: USER_STORY });
  }
}
