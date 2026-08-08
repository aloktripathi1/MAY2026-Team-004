/**
 * Groq Whisper wrapper for Ask Sangam's voice input (speech-to-text only —
 * see lib/genai.ts for the Claude client every other GenAI feature uses).
 */

const TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL = "whisper-large-v3-turbo";
const DEFAULT_TIMEOUT_MS = 20_000;

export class GroqError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GroqError";
  }
}

function getApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new GroqError("GROQ_API_KEY is not configured.");
  }
  return apiKey;
}

/**
 * Transcribes a single audio clip to text. `filename` just needs a plausible
 * extension (e.g. "clip.webm") — Groq uses it to infer the container format.
 */
export async function transcribeAudio(
  audio: Blob,
  filename: string,
  options?: { timeoutMs?: number },
): Promise<string> {
  const apiKey = getApiKey();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", MODEL);
  form.append("response_format", "text");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(TRANSCRIPTION_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new GroqError(`Groq transcription failed (${response.status}): ${detail.slice(0, 300)}`);
    }

    const text = await response.text();
    return text.trim();
  } catch (error) {
    if (error instanceof GroqError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new GroqError(`Groq request failed: ${message}`, { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}
