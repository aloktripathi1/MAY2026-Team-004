"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ChevronDown, Send } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { createAnnouncementAction, type AnnouncementFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Btn disabled={pending}><Send className="h-4 w-4" /> {pending ? "Publishing..." : "Publish"}</Btn>;
}

export function AnnouncementForm({ memberCount, onSuccess }: { memberCount: number; onSuccess?: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<AnnouncementFormState, FormData>(createAnnouncementAction, {});
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (state.ok) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction}>
      <div className="text-mono-label mb-3">Compose</div>
      <input name="title" required placeholder="Headline — what's the one thing?" className="w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-3 text-base text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-secondary/55" />
      <textarea name="body" required rows={6} placeholder="Body — details, deadline, link…" className="mt-3 w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-secondary/55" />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <div className="text-mono-label mb-1.5">Send to</div>
          <div className="relative">
            <select name="audience" defaultValue="All" className="w-full appearance-none rounded-xl border border-white/[0.12] bg-white/[0.035] py-2.5 pl-4 pr-9 text-sm text-white outline-none transition focus:border-secondary/55">
              <option value="All">All members ({memberCount})</option>
              <option value="Coordinators">Coordinators only</option>
              <option value="Volunteers">Volunteers</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </label>
        <label className="block">
          <div className="text-mono-label mb-1.5">Priority</div>
          <div className="relative">
            <select name="priority" defaultValue="Medium" className="w-full appearance-none rounded-xl border border-white/[0.12] bg-white/[0.035] py-2.5 pl-4 pr-9 text-sm text-white outline-none transition focus:border-secondary/55">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </label>
      </div>
      {state.error && <p className="mt-2 text-xs text-destructive">{state.error}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.035] px-3 py-1.5 text-xs text-muted-foreground">
          <input type="checkbox" name="pinned" className="accent-primary" /> Pin this
        </label>
        <SubmitButton />
      </div>
    </form>
  );
}
