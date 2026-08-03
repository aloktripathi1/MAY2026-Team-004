"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Send, Star } from "lucide-react";
import { Btn, GlassCard } from "@/components/ui/primitives";
import { submitFeedbackAction, type FeedbackFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Btn disabled={pending}><Send className="h-4 w-4" /> {pending ? "Sending…" : "Send feedback"}</Btn>;
}

export function FeedbackForm() {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<FeedbackFormState, FormData>(submitFeedbackAction, {});
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (state.ok) {
      formRef.current?.reset();
      setRating(null);
    }
  }, [state]);

  return (
    <GlassCard className="p-6" hover={false}>
      <form ref={formRef} action={formAction}>
        <div className="mb-4">
          <div className="text-mono-label mb-2">Rating (optional)</div>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => setRating(rating === n ? null : n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(null)}
                className="p-0.5 text-muted-foreground transition hover:scale-110"
              >
                <Star
                  className={`h-6 w-6 ${(hoverRating ?? rating ?? 0) >= n ? "fill-secondary text-secondary" : ""}`}
                />
              </button>
            ))}
          </div>
        </div>
        <input type="hidden" name="rating" value={rating ?? ""} />

        <div className="text-mono-label mb-2">Your feedback</div>
        <textarea
          name="message"
          required
          rows={4}
          placeholder="What's working, what isn't, what would make Sangam better for you?"
          className="w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-secondary/55"
        />

        {state.error && <p className="mt-2 text-xs text-destructive">{state.error}</p>}
        {state.ok && <p className="mt-2 text-xs text-success">Thanks — your feedback was sent.</p>}

        <div className="mt-4 flex justify-end">
          <SubmitButton />
        </div>
      </form>
    </GlassCard>
  );
}
