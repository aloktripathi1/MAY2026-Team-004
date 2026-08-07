import type Anthropic from "@anthropic-ai/sdk";
import { membershipsForAppRole, type AppRole } from "@/backend/auth/roles";
import type { AssistantAnswer, AssistantSessionUser } from "@/backend/domain/assistant-types";
import { executeTool, getTool, previewToolCall, toAnthropicTools } from "@/backend/assistant/tools/registry";
import { enrichUpdateTaskSummary } from "@/backend/assistant/tools/task-tools";
import type { ToolActor } from "@/backend/assistant/tools/types";
import { signPendingAction } from "@/backend/assistant/agent/pending-action";
import { GenAiError, toolCompletion, type ToolCompletionMessage } from "@/lib/genai";

const MAX_TOOL_ROUNDS = 6;

const WRITE_AGENT_SYSTEM = `You are Ask Sangam's write-action agent for a student clubs platform.

You only have the tools listed in this request (in-process Anthropic tools — not MCP). Call them when needed; do not invent capabilities you were not given.

Available tools (role-filtered — you may not have all of them):
- list_my_tasks — open tasks the user can manage (own tasks for volunteers; club open tasks for coordinators). Use before status changes.
- update_task_status — set ONE clearly identified task to todo/doing/done (needs Accept). Volunteers + coordinators.
- offer_task_status_choices — when 2+ tasks match (same person, same title filter, etc.), call this with all matching options. NEVER ask which task in chat text — the UI shows a picker.
- assign_task — create ONE task for one person (coordinator only). Resolve eventId/assigneeId first.
- list_club_events / list_club_volunteers / resolve_members_by_name — resolve ids for assign/bulk (coordinator only).
- propose_bulk_task_assignments — many different tasks → different people in one shot (max 50, coordinator only). Volunteers never get this.
- resolve_club_members_by_name — admin only; resolve named people before a targeted announcement.
- propose_announcement — draft a club announcement (admin only). Role audience All|Volunteers|Coordinators OR specific people via recipientUserIds after resolve_club_members_by_name. UI picks timing (and role audience when not targeted).

Workflow:
1. Use read tools first to resolve ids. Never invent ids.
2. Status change with one clear match → update_task_status. With 2+ matches → offer_task_status_choices (not a clarifying question).
3. "the first task" with a unique ordered list → use index 1 from list_my_tasks via update_task_status.
4. Single assign (coordinator only): resolve event + member, then assign_task. Multiple different people/tasks → propose_bulk_task_assignments.
5. If a person name for assign is ambiguous, ask in plain text with candidates; do not call a write tool until unique.
6. "all volunteers" = list_club_volunteers (Active Volunteers only).
7. Announcements (admin only): if the user names specific people, resolve_club_members_by_name then propose_announcement with recipientUserIds + recipientNames. Otherwise propose with title/body (optional audience). UI picks timing (and role audience when not person-targeted). If a name is ambiguous/missing, ask in plain text — do not guess.
8. Prefer one write-tool call once arguments are known.
9. Never claim the write already happened — the user must Accept in the UI first.
10. If a needed tool is missing from your tool list, say briefly that this role view cannot do that (e.g. volunteer cannot assign/bulk; admin cannot change tasks).`;

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

function sourceMetaForTool(
  toolName: string,
  actor: ToolActor,
): {
  sourceType: "task" | "announcement";
  sourceHref: string;
} {
  if (toolName === "propose_announcement") {
    return { sourceType: "announcement", sourceHref: "/admin/announcements" };
  }
  return {
    sourceType: "task",
    sourceHref: actor.memberships.some((m) => m.role === "Coordinator")
      ? "/coordinator/volunteers"
      : "/volunteer",
  };
}

/** Builds a signed proposedAction for a write tool (used by the agent + unit tests). */
export async function buildWriteProposal(
  actor: ToolActor,
  toolName: string,
  rawArgs: unknown,
  activeRole?: AppRole,
): Promise<AssistantAnswer> {
  const preview = previewToolCall(toolName, actor, rawArgs);
  const meta = sourceMetaForTool(toolName, actor);

  if (toolName === "offer_task_status_choices") {
    const args = preview.args as {
      status: "todo" | "doing" | "done";
      options: Array<{
        taskId: string;
        title: string;
        eventTitle?: string;
        assigneeName?: string;
      }>;
    };

    const choices = args.options.map((option) => {
      const updateArgs = { taskId: option.taskId, status: args.status };
      const token = signPendingAction({
        userId: actor.id,
        toolName: "update_task_status",
        args: updateArgs,
        ...(activeRole ? { role: activeRole } : {}),
      });
      const description = [option.assigneeName, option.eventTitle].filter(Boolean).join(" · ");
      return {
        id: option.taskId,
        label: option.title,
        ...(description ? { description } : {}),
        token,
        argsPreview: {
          title: option.title,
          status: args.status,
          ...(option.assigneeName ? { assignee: option.assigneeName } : {}),
          ...(option.eventTitle ? { event: option.eventTitle } : {}),
        },
      };
    });

    return {
      answer: "I found more than one matching task — pick one below, then Accept.",
      sourceType: meta.sourceType,
      sourceLabel: args.status,
      sourceHref: meta.sourceHref,
      proposedAction: {
        toolName: "update_task_status",
        summary: preview.summary,
        argsPreview: { status: args.status },
        token: "",
        status: "pending",
        choices,
        choicePrompt: "Select a task",
      },
    };
  }

  // Announcement: specific people → timing MCQ only; otherwise audience × timing.
  if (toolName === "propose_announcement") {
    const raw = preview.args as {
      title: string;
      body: string;
      audience?: "All" | "Coordinators" | "Volunteers";
      priority?: "Low" | "Med" | "High";
      pinned?: boolean;
      clubId?: string;
      recipientUserIds?: string[];
      recipientNames?: string[];
    };
    const base: Record<string, unknown> = {
      title: raw.title,
      body: raw.body,
      ...(raw.pinned != null ? { pinned: raw.pinned } : {}),
      ...(raw.clubId ? { clubId: raw.clubId } : {}),
    };

    const timingOptions = [
      {
        id: "send_now",
        label: "Send now",
        description: "High priority — email immediately",
        priority: "High" as const,
      },
      {
        id: "digest",
        label: "Include in digest",
        description: "Medium priority — next announcement digest",
        priority: "Med" as const,
      },
    ] as const;

    const targeted =
      Array.isArray(raw.recipientUserIds) && raw.recipientUserIds.length > 0
        ? {
            recipientUserIds: raw.recipientUserIds,
            recipientNames: raw.recipientNames ?? [],
          }
        : null;

    if (targeted) {
      base.recipientUserIds = targeted.recipientUserIds;
      if (targeted.recipientNames.length > 0) {
        base.recipientNames = targeted.recipientNames;
      }

      const whoLabel =
        targeted.recipientNames.length > 0
          ? targeted.recipientNames.join(", ")
          : `${targeted.recipientUserIds.length} member(s)`;

      const choices = timingOptions.map((timing) => {
        const args = { ...base, audience: "All" as const, priority: timing.priority };
        const token = signPendingAction({
          userId: actor.id,
          toolName: "propose_announcement",
          args,
          ...(activeRole ? { role: activeRole } : {}),
        });
        const argsPreview = previewToolCall("propose_announcement", actor, args).argsPreview;
        return {
          id: `specific__${timing.id}`,
          label: timing.label,
          description: timing.description,
          token,
          argsPreview,
        };
      });

      return {
        answer: `I can post that to ${whoLabel} — choose when it should send, then Accept.`,
        sourceType: meta.sourceType,
        sourceLabel: raw.title,
        sourceHref: meta.sourceHref,
        proposedAction: {
          toolName: "propose_announcement",
          summary: `Post announcement “${raw.title}” to ${whoLabel}`,
          argsPreview: {
            title: raw.title,
            to: whoLabel,
            body: raw.body.length > 160 ? `${raw.body.slice(0, 157)}…` : raw.body,
          },
          token: "",
          status: "pending",
          choices,
          choiceGroups: [
            {
              id: "audience",
              prompt: "Who should receive this?",
              options: [
                {
                  id: "specific",
                  label: whoLabel,
                  description: "Specific people named in your request",
                },
              ],
            },
            {
              id: "timing",
              prompt: "When should this send?",
              options: timingOptions.map(({ id, label, description }) => ({ id, label, description })),
            },
          ],
          defaultGroupSelections: { audience: "specific" },
        },
      };
    }

    const audienceOptions = [
      {
        id: "All",
        label: "All members",
        description: "Members, volunteers, coordinators, and admins",
      },
      {
        id: "Volunteers",
        label: "Volunteers",
        description: "Volunteers (coordinators and admins also included)",
      },
      {
        id: "Coordinators",
        label: "Coordinators",
        description: "Coordinators and admins only",
      },
    ] as const;

    const choices = audienceOptions.flatMap((audience) =>
      timingOptions.map((timing) => {
        const args = {
          ...base,
          audience: audience.id,
          priority: timing.priority,
        };
        const token = signPendingAction({
          userId: actor.id,
          toolName: "propose_announcement",
          args,
          ...(activeRole ? { role: activeRole } : {}),
        });
        const argsPreview = previewToolCall("propose_announcement", actor, args).argsPreview;
        return {
          id: `${audience.id}__${timing.id}`,
          label: `${audience.label} · ${timing.label}`,
          description: `${audience.description}. ${timing.description}`,
          token,
          argsPreview,
        };
      }),
    );

    const suggestedAudience = String(raw.audience ?? "All");
    const defaultAudience = audienceOptions.some((o) => o.id === suggestedAudience)
      ? suggestedAudience
      : "All";

    return {
      answer: "I can post that — choose who should receive it and when it should send, then Accept.",
      sourceType: meta.sourceType,
      sourceLabel: raw.title,
      sourceHref: meta.sourceHref,
      proposedAction: {
        toolName: "propose_announcement",
        summary: `Post announcement “${raw.title}”`,
        argsPreview: {
          title: raw.title,
          body: raw.body.length > 160 ? `${raw.body.slice(0, 157)}…` : raw.body,
        },
        token: "",
        status: "pending",
        choices,
        choiceGroups: [
          {
            id: "audience",
            prompt: "Who should receive this?",
            options: audienceOptions.map(({ id, label, description }) => ({ id, label, description })),
          },
          {
            id: "timing",
            prompt: "When should this send?",
            options: timingOptions.map(({ id, label, description }) => ({ id, label, description })),
          },
        ],
        defaultGroupSelections: { audience: defaultAudience },
      },
    };
  }

  let summary = preview.summary;
  if (toolName === "update_task_status" && preview.args && typeof preview.args === "object") {
    const args = preview.args as { taskId: string; status: "todo" | "doing" | "done" };
    summary = await enrichUpdateTaskSummary(args);
  }

  const token = signPendingAction({
    userId: actor.id,
    toolName,
    args: preview.args as Record<string, unknown>,
    ...(activeRole ? { role: activeRole } : {}),
  });

  return {
    answer: `I can do that — please confirm below.`,
    sourceType: meta.sourceType,
    sourceLabel:
      preview.argsPreview.title ??
      preview.argsPreview.status ??
      preview.argsPreview.count ??
      preview.argsPreview.taskId,
    sourceHref: meta.sourceHref,
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
 * Claude tool loop for task / bulk / announcement writes.
 * Read tools auto-execute; write tools become a signed proposedAction.
 */
export async function runWriteToolAgent(
  user: AssistantSessionUser,
  question: string,
  activeRole?: AppRole,
): Promise<AssistantAnswer> {
  const actor = toToolActor(user, activeRole);
  const tools = toAnthropicTools(actor);

  if (tools.length === 0) {
    return {
      answer:
        "That action isn't available in this role view. Open volunteer for your task status, coordinator for assign/bulk, or admin for announcements.",
      sourceType: null,
    };
  }

  const messages: ToolCompletionMessage[] = [{ role: "user", content: question }];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const result = await toolCompletion({
        system: WRITE_AGENT_SYSTEM,
        messages,
        tools,
        maxTokens: 2048,
      });

      const toolUses = result.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use",
      );

      if (toolUses.length === 0) {
        const answer = textFromContent(result.content) || "I couldn't complete that action.";
        return { answer, sourceType: null };
      }

      for (const use of toolUses) {
        const registered = getTool(use.name);
        if (registered?.requiresConfirmation) {
          return buildWriteProposal(actor, use.name, use.input, activeRole);
        }
      }

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
      answer: "I couldn't finish that action in time. Please try again with a clearer request.",
      sourceType: null,
    };
  } catch (error) {
    if (error instanceof GenAiError) {
      console.error("[assistant] write tool agent failed", error.message);
      return {
        answer: "Ask Sangam is temporarily unavailable. Please try again in a moment.",
        sourceType: null,
      };
    }
    throw error;
  }
}
