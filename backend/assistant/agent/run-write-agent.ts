import type Anthropic from "@anthropic-ai/sdk";
import { membershipsForAppRole, SURFACE_ROLES, type AppRole } from "@/backend/auth/roles";
import type { AssistantAnswer, AssistantSessionUser } from "@/backend/domain/assistant-types";
import { executeTool, getTool, previewToolCall, toAnthropicTools } from "@/backend/assistant/tools/registry";
import { enrichUpdateTaskSummary } from "@/backend/assistant/tools/task-tools";
import type { ToolActor } from "@/backend/assistant/tools/types";
import { signPendingAction } from "@/backend/assistant/agent/pending-action";
import { GenAiError, toolCompletion, type ToolCompletionMessage } from "@/lib/genai";

const MAX_TOOL_ROUNDS = 6;

const DEFAULT_PENDING_WRITE_ANSWER = "I can do that — please confirm below.";

/**
 * Merges optional model companion text into the fixed pending-write answer.
 * Keeps the default confirm copy when empty; preserves existing single-write UX.
 */
export function composePendingWriteAnswer(
  companionText: string,
  defaultAnswer: string = DEFAULT_PENDING_WRITE_ANSWER,
): string {
  const extra = companionText.trim();
  if (!extra) return defaultAnswer;
  // Model already wrote the user-facing confirm framing — use it as-is.
  if (/please confirm|confirm below/i.test(extra)) return extra;
  return `${defaultAnswer} ${extra}`;
}

/**
 * Pulls a trailing second write from multi-ask phrasing (deterministic — not LLM).
 * e.g. `Mark X as doing, also assign check-in to Y for Z` → `assign check-in to Y for Z`
 */
export function extractDeferredWriteRequest(question: string): string | null {
  const parts = splitMultiWriteRequests(question);
  if (parts.length < 2) return null;
  return parts.slice(1).join(", also ");
}

/**
 * Split a multi-write user message into N segments.
 * Separators: `, also` / `; also` / ` and also ` / bare ` also ` (case-insensitive).
 * No separator → `[question]`.
 */
export function splitMultiWriteRequests(question: string): string[] {
  const trimmed = question.trim();
  if (!trimmed) return [];

  const parts = trimmed
    .split(/(?:,|\.|!|;)?\s*(?:and\s+)?also\s+/i)
    .map((part) => part.replace(/^[.,!;:\s]+|[.?!]+$/gu, "").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : [trimmed];
}

/** Ensures a multi-ask leftover is acknowledged even when the model omits companion text. */
export function appendDeferredWriteNote(answer: string, deferredRequest: string | null): string {
  if (!deferredRequest) return answer;
  if (/after you confirm|ask me again/i.test(answer)) return answer;
  return `${answer} After you confirm, ask me again to ${deferredRequest}.`;
}

/** Merge N write-agent results into one answer with proposedActions (N cards). */
export function mergeMultiWriteAnswers(results: AssistantAnswer[]): AssistantAnswer {
  const proposedActions = results
    .map((r) => r.proposedAction)
    .filter((action): action is NonNullable<typeof action> => Boolean(action));

  const clarifications = results
    .filter((r) => !r.proposedAction)
    .map((r) => r.answer.trim())
    .filter(Boolean);

  if (proposedActions.length === 0) {
    return {
      answer: clarifications.join(" ") || "I couldn't complete that action.",
      sourceType: null,
    };
  }

  const confirmCopy =
    proposedActions.length === 1
      ? DEFAULT_PENDING_WRITE_ANSWER
      : `I can do that — please confirm each of the ${proposedActions.length} actions below.`;

  const answer = clarifications.length > 0 ? `${confirmCopy} ${clarifications.join(" ")}` : confirmCopy;
  const firstWithMeta = results.find((r) => r.proposedAction);

  return {
    answer,
    sourceType: firstWithMeta?.sourceType ?? null,
    sourceLabel: firstWithMeta?.sourceLabel,
    sourceHref: firstWithMeta?.sourceHref,
    proposedAction: proposedActions[0],
    proposedActions,
  };
}

/**
 * Resolve one or many write segments. When the question has multiple also-joined
 * writes, runs the write agent per segment and returns N proposal cards.
 */
export async function runWriteToolAgentForQuestion(
  user: AssistantSessionUser,
  question: string,
  activeRole?: AppRole,
): Promise<AssistantAnswer> {
  const segments = splitMultiWriteRequests(question);
  if (segments.length <= 1) {
    return runWriteToolAgent(user, question, activeRole);
  }

  const results: AssistantAnswer[] = [];
  for (const segment of segments) {
    results.push(await runWriteToolAgent(user, segment, activeRole));
  }
  return mergeMultiWriteAnswers(results);
}

/** System prompt for the write tool loop — exported for unit coverage of shell/defer rules. */
export function writeAgentSystemPrompt(activeRole?: AppRole): string {
  const shellLine = activeRole
    ? `The user is currently in the "${activeRole}" role view. Trust this shell and the tools you were given for what they can do.`
    : `Trust the tools you were given for what this user can do in their current role view.`;

  return `You are Ask Sangam's write-action agent for a student clubs platform.

You only have the tools listed in this request (in-process Anthropic tools — not MCP). Call them when needed; do not invent capabilities you were not given.

${shellLine}
If the user phrases things as a different role (e.g. says "as admin" while in coordinator), do NOT say they lack access — use the tools available in this shell. You may briefly note which view they are in if their wording conflicts.

Available tools (role-filtered — you may not have all of them):
- list_my_tasks — open tasks the user can manage (own tasks for volunteers; club open tasks for coordinators and admins). Use before status changes.
- update_task_status — set ONE clearly identified task to todo/doing/done (needs Accept). Volunteers, coordinators, and admins.
- offer_task_status_choices — when 2+ tasks match (same person, same title filter, etc.), call this with all matching options. NEVER ask which task in chat text — the UI shows a picker.
- assign_task — create ONE task for one person (coordinator or admin). Resolve eventId/assigneeId first.
- list_club_events / list_club_volunteers / resolve_members_by_name — resolve ids for assign/bulk (coordinator or admin).
- propose_bulk_task_assignments — many different tasks → different people in one shot (max 50, coordinator or admin). Volunteers never get this.
- resolve_club_members_by_name — admin only; resolve named people before a targeted announcement.
- propose_announcement — draft a club announcement (admin only). Role audience All|Volunteers|Coordinators OR specific people via recipientUserIds after resolve_club_members_by_name. UI picks timing (and role audience when not targeted).

Workflow:
1. Use read tools first to resolve ids. Never invent ids.
2. Status change with one clear match → update_task_status. With 2+ matches → offer_task_status_choices (not a clarifying question).
3. "the first task" with a unique ordered list → use index 1 from list_my_tasks via update_task_status.
4. Single assign (coordinator or admin): resolve event + member, then assign_task. Multiple different people/tasks → propose_bulk_task_assignments.
5. If a person name for assign is ambiguous, ask in plain text with candidates; do not call a write tool until unique.
6. "all volunteers" = list_club_volunteers (Active Volunteers only).
7. Announcements (admin only): if the user names specific people, resolve_club_members_by_name then propose_announcement with recipientUserIds + recipientNames. Otherwise propose with title/body (optional audience). UI picks timing (and role audience when not person-targeted). If a name is ambiguous/missing, ask in plain text — do not guess.
8. Prefer one write-tool call once arguments are known for THIS message segment.
9. This call is already a single write segment (multi-ask messages are split upstream). Do not defer sibling asks.
10. Never claim the write already happened — the user must Accept in the UI first.
11. If a needed tool is missing from your tool list, say briefly that this role view cannot do that (e.g. volunteer cannot assign/bulk; member/faculty cannot manage tasks). Base that only on the missing tool / shell — not on how the user described themselves.`;
}

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
  const coordinatorSurfaceRoles = SURFACE_ROLES.Coordinator ?? ["Coordinator"];
  return {
    sourceType: "task",
    sourceHref: actor.memberships.some((m) => coordinatorSurfaceRoles.includes(m.role))
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
  deferredNote?: string,
): Promise<AssistantAnswer> {
  const preview = previewToolCall(toolName, actor, rawArgs);
  const meta = sourceMetaForTool(toolName, actor);
  const deferredFields = deferredNote ? { deferredNote } : {};

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
        ...deferredFields,
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
          ...deferredFields,
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
          ...deferredFields,
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
    ...deferredFields,
  });

  return {
    answer: DEFAULT_PENDING_WRITE_ANSWER,
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
        system: writeAgentSystemPrompt(activeRole),
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
          const deferred = extractDeferredWriteRequest(question);
          const proposal = await buildWriteProposal(
            actor,
            use.name,
            use.input,
            activeRole,
            deferred ?? undefined,
          );
          return {
            ...proposal,
            answer: appendDeferredWriteNote(
              composePendingWriteAnswer(textFromContent(result.content), proposal.answer),
              deferred,
            ),
          };
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
