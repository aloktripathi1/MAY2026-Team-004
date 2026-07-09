"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { createAnnouncementAction, type AnnouncementFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Btn disabled={pending}><Send className="h-4 w-4" /> {pending ? "Publishing..." : "Publish"}</Btn>;
}

export function AnnouncementForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<AnnouncementFormState, FormData>(createAnnouncementAction, {});
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <div className="text-mono-label mb-3">Compose</div>
      <input name="title" required placeholder="Headline — what's the one thing?" className="w-full rounded-xl border border-hairline bg-surface/60 px-4 py-3 text-base outline-none focus:border-primary/60" />
      <textarea name="body" required rows={6} placeholder="Body — details, deadline, link…" className="mt-3 w-full rounded-xl border border-hairline bg-surface/60 px-4 py-3 text-sm outline-none focus:border-primary/60" />
      {state.error && <p className="mt-2 text-xs text-destructive">{state.error}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1 text-xs text-muted-foreground">
          <input type="checkbox" name="pinned" className="accent-primary" /> Pin this
        </label>
        <SubmitButton />
      </div>
    </form>
  );
}
