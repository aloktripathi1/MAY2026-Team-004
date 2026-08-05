import type { z } from "zod";
import type { SessionMembership } from "@/backend/auth/session-cookies";

/** Session actor passed into every tool — same shape domain task helpers expect. */
export type ToolActor = {
  id: string;
  isFaculty: boolean;
  memberships: SessionMembership[];
};

export type ToolRisk = "read" | "write";

export type ToolExecuteResult = {
  /** JSON-serializable payload returned to Claude as tool_result (reads) or to confirm API. */
  data: unknown;
  /** Short human summary for UI / completion messages. */
  summary: string;
  /** Optional source link metadata for Ask Sangam bubbles. */
  sourceLabel?: string;
  sourceHref?: string;
};

/**
 * One assistant tool. Domain modules never import this — tools wrap domain instead.
 * `inputSchema` is Zod for validation; `anthropicInputSchema` is the JSON Schema Claude sees.
 */
export type AssistantTool<TArgs = unknown> = {
  name: string;
  description: string;
  risk: ToolRisk;
  requiresConfirmation: boolean;
  /** When set, tool is omitted from Claude's tool list unless the actor matches. */
  isAvailable?: (actor: ToolActor) => boolean;
  inputSchema: z.ZodType<TArgs>;
  anthropicInputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
  /** Build a display-safe args preview for the proposal card. */
  previewArgs: (args: TArgs) => Record<string, string>;
  /** Human-readable proposal / completion summary. */
  summarize: (args: TArgs, result?: unknown) => string;
  execute: (actor: ToolActor, args: TArgs) => Promise<ToolExecuteResult>;
};
