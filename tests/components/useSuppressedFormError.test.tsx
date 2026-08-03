import { renderHook, act } from "@testing-library/react";
import { useSuppressedFormError } from "@/components/hooks/useSuppressedFormError";

const ERROR_MESSAGE = "That name is already taken.";

describe("useSuppressedFormError (#67)", () => {
  it("shows no error before any submission", () => {
    const { result } = renderHook(() => useSuppressedFormError(undefined));
    expect(result.current.visibleError).toBeUndefined();
  });

  it("surfaces an error from the current submission", () => {
    const { result, rerender } = renderHook(
      ({ error }) => useSuppressedFormError(error),
      { initialProps: { error: undefined as string | undefined } },
    );

    // Mirrors EditDetailsModal's handleFormAction: clearSuppression() fires
    // synchronously right before dispatch, then the server's error arrives
    // once the action resolves and useFormState's state updates.
    act(() => result.current.clearSuppression());
    rerender({ error: ERROR_MESSAGE });

    expect(result.current.visibleError).toBe(ERROR_MESSAGE);
  });

  it("suppresses a stale error across a close/reopen cycle even though the underlying error hasn't changed", () => {
    const { result, rerender } = renderHook(
      ({ error }) => useSuppressedFormError(error),
      { initialProps: { error: undefined as string | undefined } },
    );

    act(() => result.current.clearSuppression());
    rerender({ error: ERROR_MESSAGE });
    expect(result.current.visibleError).toBe(ERROR_MESSAGE);

    // Modal closes and reopens: resetForSession() runs (mirrors the open-effect).
    act(() => result.current.resetForSession());
    // useFormState's own state is untouched by a close/reopen — the error prop
    // is still the old value. This proves suppression, not accidental clearing.
    rerender({ error: ERROR_MESSAGE });
    expect(result.current.visibleError).toBeUndefined();
  });

  it("still surfaces a fresh error from a new submission after reopening", () => {
    const { result, rerender } = renderHook(
      ({ error }) => useSuppressedFormError(error),
      { initialProps: { error: undefined as string | undefined } },
    );

    act(() => result.current.clearSuppression());
    rerender({ error: ERROR_MESSAGE });
    act(() => result.current.resetForSession());
    rerender({ error: ERROR_MESSAGE });
    expect(result.current.visibleError).toBeUndefined();

    // A new submission in the reopened session un-suppresses again.
    act(() => result.current.clearSuppression());
    expect(result.current.visibleError).toBe(ERROR_MESSAGE);
  });
});
