import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod/v4";

/**
 * Shared Claude client wrapper for every GenAI feature in the app (Ask
 * Sangam's classify/generate steps, and any future feature like the
 * handover brief generator) — one place to configure the model, timeouts,
 * and error handling instead of each feature calling the SDK directly.
 */

const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_EFFORT = "medium";
const DEFAULT_TIMEOUT_MS = 15_000;

export class GenAiError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GenAiError";
  }
}

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new GenAiError("ANTHROPIC_API_KEY is not configured.");
  }

  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

function toGenAiError(error: unknown): GenAiError {
  if (error instanceof GenAiError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new GenAiError(`Claude request failed: ${message}`, { cause: error });
}

/**
 * A single Claude call constrained to return JSON matching `schema`, parsed
 * and validated before it's handed back — callers never see raw model text.
 */
export async function structuredCompletion<Schema extends z.ZodType>(options: {
  system: string;
  prompt: string;
  schema: Schema;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<z.infer<Schema>> {
  const { system, prompt, schema, maxTokens = 1024, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  if (process.env.ASK_SANGAM_TRACE) {
    console.log("\n[TRACE structuredCompletion] === SYSTEM PROMPT ===\n" + system);
    console.log("[TRACE structuredCompletion] === USER PROMPT ===\n" + prompt);
  }

  try {
    const message = await getClient().messages.parse(
      {
        model: DEFAULT_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: zodOutputFormat(schema), effort: DEFAULT_EFFORT },
      },
      { timeout: timeoutMs },
    );

    if (process.env.ASK_SANGAM_TRACE) {
      const rawText = message.content.find((b) => b.type === "text")?.text ?? "<no text block>";
      console.log("[TRACE structuredCompletion] === RAW RESPONSE (pre-parse) ===\n" + rawText);
      console.log("[TRACE structuredCompletion] === PARSED OUTPUT ===\n" + JSON.stringify(message.parsed_output, null, 2));
    }

    if (!message.parsed_output) {
      throw new GenAiError("Claude returned no parsable structured output.");
    }
    return message.parsed_output;
  } catch (error) {
    throw toGenAiError(error);
  }
}

/** A single Claude call that returns plain natural-language text. */
export async function textCompletion(options: {
  system: string;
  prompt: string;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string> {
  const { system, prompt, maxTokens = 512, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  if (process.env.ASK_SANGAM_TRACE) {
    console.log("\n[TRACE textCompletion] === SYSTEM PROMPT ===\n" + system);
    console.log("[TRACE textCompletion] === USER PROMPT (incl. data sent) ===\n" + prompt);
  }

  try {
    const message = await getClient().messages.create(
      {
        model: DEFAULT_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
        output_config: { effort: DEFAULT_EFFORT },
      },
      { timeout: timeoutMs },
    );

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new GenAiError("Claude returned no text output.");
    }

    if (process.env.ASK_SANGAM_TRACE) {
      console.log("[TRACE textCompletion] === FINAL ANSWER ===\n" + textBlock.text.trim());
    }

    return textBlock.text.trim();
  } catch (error) {
    throw toGenAiError(error);
  }
}

export type ToolCompletionMessage = Anthropic.Messages.MessageParam;
export type ToolCompletionTool = Anthropic.Messages.Tool;
export type ToolCompletionContent = Anthropic.Messages.ContentBlock;

export type ToolCompletionResult = {
  content: ToolCompletionContent[];
  stopReason: Anthropic.Messages.StopReason | null;
};

/**
 * A Claude Messages call with tools. Returns raw content blocks and stop_reason
 * so callers can run their own tool loops. Knows nothing about Sangam tools.
 */
export async function toolCompletion(options: {
  system: string;
  messages: ToolCompletionMessage[];
  tools: ToolCompletionTool[];
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<ToolCompletionResult> {
  const { system, messages, tools, maxTokens = 1024, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  if (process.env.ASK_SANGAM_TRACE) {
    console.log("\n[TRACE toolCompletion] === SYSTEM PROMPT ===\n" + system);
    console.log("[TRACE toolCompletion] === MESSAGES ===\n" + JSON.stringify(messages, null, 2));
    console.log("[TRACE toolCompletion] === TOOLS ===\n" + tools.map((t) => t.name).join(", "));
  }

  try {
    const message = await getClient().messages.create(
      {
        model: DEFAULT_MODEL,
        max_tokens: maxTokens,
        system,
        messages,
        tools,
        output_config: { effort: DEFAULT_EFFORT },
      },
      { timeout: timeoutMs },
    );

    if (process.env.ASK_SANGAM_TRACE) {
      console.log(
        "[TRACE toolCompletion] === RESPONSE ===\n" +
          JSON.stringify({ stop_reason: message.stop_reason, content: message.content }, null, 2),
      );
    }

    return {
      content: message.content,
      stopReason: message.stop_reason,
    };
  } catch (error) {
    throw toGenAiError(error);
  }
}
