import type Anthropic from "@anthropic-ai/sdk";
import { membershipsForAppRole, type AppRole } from "@/backend/auth/roles";
import type { AssistantAnswer, AssistantSessionUser } from "@/backend/domain/assistant-types";
import { enrichUpdateTaskSummary } from "@/backend/assistant/tools/task-tools";
import { executeTool, getTool, previewToolCall, toAnthropicTools } from "@/backend/assistant/tools/registry";
import type { ToolActor } from "@/backend/assistant/tools/types";
import { signPendingAction } from "@/backend/assistant/agent/pending-action";
import { GenAiError, toolCompletion, type ToolCompletionMessage } from "@/lib/genai";

const MAX_TOOL_ROUNDS = 4;

const TASK_AGENT_SYSTEM = `You are Ask Sangam's task-action agent for a student clubs platform.

You help the user change task status or (if available) assign tasks using the provided tools.

Rules:
- For status updates, call list_my_tasks first when you need a taskId, then call update_task_status with the matching id.
- Never invent task ids, event ids, or assignee ids — only use values returned by tools or clearly provided by the user.
- Prefer a single write tool call once you know the arguments.
- Do not claim a write already happened — the user must Accept a proposal in the UI before anything is saved.
- If you cannot complete the request with the available tools, say so briefly in plain text.`;

/**
 * Builds the actor for tool calls. When the caller reports which shell they're
 * in, only that shell's memberships count — so a coordinator asking from the
 * member app gets member capabilities, not coordinator ones.
 */
export function toToolActor(user: AssistantSessionUser, activeRole?: AppRole): ToolActor {
  return {
    id: user.id,
    isFaculty: activeRole ? activeRole === "faculty" && user.isFaculty : user.isFaculty,
    memberships: activeRole ? membershipsForAppRole(user.memberships, activeRole) : user.memberships,
  };
}

function textFromContent(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join("\n");
}

function assistantContentToParam(
  content: Anthropic.Messages.ContentBlock[],
): Anthropic.Messages.ContentBlockParam[] {
  const params: Anthropic.Messages.ContentBlockParam[] = [];
  for (const block of content) {
    if (block.type === "text" && block.text.trim()) {
      params.push({ type: "text", text: block.text });
    } else if (block.type === "tool_use") {
      params.push({
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: block.input,
      });
    }
  }
  return params.length > 0 ? params : [{ type: "text", text: "" }];
}

async function buildWriteProposal(
  actor: ToolActor,
  toolName: string,
  rawArgs: unknown,
  activeRole?: AppRole,
): Promise<AssistantAnswer> {
  const preview = previewToolCall(toolName, actor, rawArgs);
  let summary = preview.summary;
  if (toolName === "update_task_status" && preview.args && typeof preview.args === "object") {
    const args = preview.args as { taskId: string; status: "todo" | "doing" | "done" };
    summary = await enrichUpdateTaskSummary(args);
  }

  // The role travels inside the signed token so Accept runs with the same
  // scope the proposal was built under.
  const token = signPendingAction({
    userId: actor.id,
    toolName,
    args: preview.args as Record<string, unknown>,
    ...(activeRole ? { role: activeRole } : {}),
  });

  return {
    answer: `I can do that — please confirm below.`,
    sourceType: "task",
    sourceLabel: preview.argsPreview.title ?? preview.argsPreview.taskId,
    sourceHref:
      actor.memberships.some((m) => m.role === "Coordinator" || m.role === "Admin")
        ? "/coordinator/volunteers"
        : "/volunteer",
    proposedAction: {
      toolName,
      summary,
      argsPreview: preview.argsPreview,
      token,
      status: "pending",
    },
  };
}

/**
 * Claude tool loop for task mutations. Read tools auto-execute; write tools
 * become a signed proposedAction and stop the loop without mutating the DB.
 */
export async function runTaskToolAgent(
  user: AssistantSessionUser,
  question: string,
  activeRole?: AppRole,
): Promise<AssistantAnswer> {
  const actor = toToolActor(user, activeRole);
  const tools = toAnthropicTools(actor);

  if (tools.length === 0) {
    return {
      answer: "Task changes are only available to volunteers and coordinators, so I can't do that for you.",
      sourceType: null,
    };
  }

  const messages: ToolCompletionMessage[] = [{ role: "user", content: question }];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const result = await toolCompletion({
        system: TASK_AGENT_SYSTEM,
        messages,
        tools,
        maxTokens: 1024,
      });

      const toolUses = result.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use",
      );

      if (toolUses.length === 0) {
        const answer = textFromContent(result.content) || "I couldn't complete that task action.";
        return { answer, sourceType: null };
      }

      // Prefer the first write proposal; do not execute writes.
      for (const use of toolUses) {
        const registered = getTool(use.name);
        if (registered?.requiresConfirmation) {
          return buildWriteProposal(actor, use.name, use.input, activeRole);
        }
      }

      // All tool uses are auto-run reads — execute and continue.
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        try {
          const executed = await executeTool(use.name, actor, use.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: JSON.stringify(executed.data),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          toolResults.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: JSON.stringify({ error: message }),
            is_error: true,
          });
        }
      }

      messages.push({ role: "assistant", content: assistantContentToParam(result.content) });
      messages.push({ role: "user", content: toolResults });
    }

    return {
      answer: "I couldn't finish that task action in time. Please try again with a clearer request.",
      sourceType: null,
    };
  } catch (error) {
    if (error instanceof GenAiError) {
      console.error("[assistant] task tool agent failed", error.message);
      return {
        answer: "Ask Sangam is temporarily unavailable. Please try again in a moment.",
        sourceType: null,
      };
    }
    throw error;
  }
}
