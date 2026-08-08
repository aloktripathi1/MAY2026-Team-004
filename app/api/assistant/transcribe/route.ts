import { getAuthCookieUserId } from "@/backend/auth/session-cookies";
import { jsonError, jsonSuccess } from "@/backend/api/http";
import { transcribeAudio, GroqError } from "@/lib/groq";

const USER_STORY = "Ask Sangam";

// Groq's free-tier transcription cap; reject early instead of paying for the
// round trip to find out.
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const userId = getAuthCookieUserId();
  if (!userId) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", { status: 401, userStory: USER_STORY });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("INVALID_FORM", "Request must be multipart/form-data.", { status: 400, userStory: USER_STORY });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return jsonError("VALIDATION_ERROR", "No audio file provided.", { status: 400, userStory: USER_STORY });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return jsonError("VALIDATION_ERROR", "Recording is too long. Keep clips under 25MB.", {
      status: 400,
      userStory: USER_STORY,
    });
  }

  try {
    const text = await transcribeAudio(audio, "clip.webm");
    if (!text) {
      return jsonError("EMPTY_TRANSCRIPT", "Didn't catch that — try speaking again.", {
        status: 422,
        userStory: USER_STORY,
      });
    }
    return jsonSuccess({ text }, { status: 200, userStory: USER_STORY });
  } catch (error) {
    if (error instanceof GroqError) {
      console.error("[POST /api/assistant/transcribe]", error.message);
    } else {
      console.error("[POST /api/assistant/transcribe]", error);
    }
    return jsonError("INTERNAL_ERROR", "Voice transcription is temporarily unavailable. Please try again.", {
      status: 500,
      userStory: USER_STORY,
    });
  }
}
