import type Anthropic from "@anthropic-ai/sdk";
import { TASK_TOOLS } from "@/backend/assistant/tools/task-tools";
import type { AssistantTool, ToolActor, ToolExecuteResult } from "@/backend/assistant/tools/types";

const toolsByName = new Map<string, AssistantTool>();

function register(tool: AssistantTool) {
  if (toolsByName.has(tool.name)) {
    throw new Error(`Duplicate assistant tool registration: ${tool.name}`);
  }
  toolsByName.set(tool.name, tool);
}

for (const tool of TASK_TOOLS) {
  register(tool as AssistantTool);
}

/** Look up a registered tool by name. */
export function getTool(name: string): AssistantTool | undefined {
  return toolsByName.get(name);
}

/** All registered tools (for tests). */
export function listRegisteredTools(): AssistantTool[] {
  return [...toolsByName.values()];
}

/** Tools available to this actor (role-gated). */
export function toolsForActor(actor: ToolActor): AssistantTool[] {
  return [...toolsByName.values()].filter((tool) => (tool.isAvailable ? tool.isAvailable(actor) : true));
}

/** Anthropic Messages API tool definitions for the given actor. */
export function toAnthropicTools(actor: ToolActor): Anthropic.Messages.Tool[] {
  return toolsForActor(actor).map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.anthropicInputSchema,
  }));
}

/**
 * Validate args and execute a tool. Used by the confirm API for writes and by
 * the agent loop for auto-run reads. Does not enforce requiresConfirmation —
 * callers decide when execution is allowed.
 */
export async function executeTool(
  name: string,
  actor: ToolActor,
  rawArgs: unknown,
): Promise<ToolExecuteResult> {
  const tool = toolsByName.get(name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  if (tool.isAvailable && !tool.isAvailable(actor)) {
    throw new Error(`Tool not available for this user: ${name}`);
  }
  const args = tool.inputSchema.parse(rawArgs);
  return tool.execute(actor, args);
}

/** Parse and preview a tool call without executing (for proposals). */
export function previewToolCall(
  name: string,
  actor: ToolActor,
  rawArgs: unknown,
): { args: unknown; argsPreview: Record<string, string>; summary: string; tool: AssistantTool } {
  const tool = toolsByName.get(name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  if (tool.isAvailable && !tool.isAvailable(actor)) {
    throw new Error(`Tool not available for this user: ${name}`);
  }
  const args = tool.inputSchema.parse(rawArgs);
  return {
    args,
    argsPreview: tool.previewArgs(args),
    summary: tool.summarize(args),
    tool,
  };
}
