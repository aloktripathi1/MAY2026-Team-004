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
    return textBlock.text.trim();
  } catch (error) {
    throw toGenAiError(error);
  }
}
