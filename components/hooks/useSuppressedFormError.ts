import { useState } from "react";

/**
 * useFormState's error persists after a modal/form session ends, so
 * reopening shows a stale error from the *previous* submission even though
 * the fields themselves reset (#67). This suppresses the error whenever a
 * new session starts (call `resetForSession` when the modal opens), and
 * un-suppresses it the moment a fresh submission in the current session
 * actually begins (call `clearSuppression` right before dispatching the
 * form action) — so a genuinely new error still surfaces immediately.
 */
export function useSuppressedFormError(error: string | undefined) {
  const [suppressed, setSuppressed] = useState(false);

  return {
    visibleError: suppressed ? undefined : error,
    resetForSession: () => setSuppressed(true),
    clearSuppression: () => setSuppressed(false),
  };
}
