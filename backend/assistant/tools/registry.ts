import type Anthropic from "@anthropic-ai/sdk";
import { ANNOUNCEMENT_TOOLS } from "@/backend/assistant/tools/announcement-tools";
import { BULK_TASK_TOOLS } from "@/backend/assistant/tools/bulk-task-tools";
import { TASK_TOOLS } from "@/backend/assistant/tools/task-tools";
import type { AssistantTool, ToolActor, ToolExecuteResult } from "@/backend/assistant/tools/types";

const toolsByName = new Map<string, AssistantTool>();

function register(tool: AssistantTool) {
  if (toolsByName.has(tool.name)) {
    throw new Error(`Duplicate assistant tool registration: ${tool.name}`);
  }
  toolsByName.set(tool.name, tool);
}

for (const tool of [...TASK_TOOLS, ...BULK_TASK_TOOLS, ...ANNOUNCEMENT_TOOLS]) {
  register(tool as AssistantTool);
}

export function getTool(name: string): AssistantTool | undefined {
  return toolsByName.get(name);
}

export function listRegisteredTools(): AssistantTool[] {
  return [...toolsByName.values()];
}

export function toolsForActor(actor: ToolActor): AssistantTool[] {
  return [...toolsByName.values()].filter((tool) => (tool.isAvailable ? tool.isAvailable(actor) : true));
}

export function toAnthropicTools(actor: ToolActor): Anthropic.Messages.Tool[] {
  return toolsForActor(actor).map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.anthropicInputSchema,
  }));
}

export async function executeTool(
  name: string,
  actor: ToolActor,
  rawArgs: unknown,
): Promise<ToolExecuteResult> {
  const tool = toolsByName.get(name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  if (tool.isAvailable && !tool.isAvailable(actor)) {
    throw new Error(`Tool not available for this user: ${name}`);
  }
  const args = tool.inputSchema.parse(rawArgs);
  return tool.execute(actor, args);
}

export function previewToolCall(
  name: string,
  actor: ToolActor,
  rawArgs: unknown,
): { args: unknown; argsPreview: Record<string, string>; summary: string; tool: AssistantTool } {
  const tool = toolsByName.get(name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
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
