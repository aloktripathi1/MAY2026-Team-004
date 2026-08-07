import type { z } from "zod";
import type { SessionMembership } from "@/backend/auth/session-cookies";

/** Session actor passed into every tool — same shape domain helpers expect. */
export type ToolActor = {
  id: string;
  isFaculty: boolean;
  memberships: SessionMembership[];
};

export type ToolRisk = "read" | "write";

export type ToolExecuteResult = {
  data: unknown;
  summary: string;
  sourceLabel?: string;
  sourceHref?: string;
};

/**
 * One assistant tool. Domain modules never import this — tools wrap domain instead.
 */
export type AssistantTool<TArgs = unknown> = {
  name: string;
  description: string;
  risk: ToolRisk;
  requiresConfirmation: boolean;
  isAvailable?: (actor: ToolActor) => boolean;
  inputSchema: z.ZodType<TArgs>;
  anthropicInputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
  previewArgs: (args: TArgs) => Record<string, string>;
  summarize: (args: TArgs, result?: unknown) => string;
  execute: (actor: ToolActor, args: TArgs) => Promise<ToolExecuteResult>;
};
