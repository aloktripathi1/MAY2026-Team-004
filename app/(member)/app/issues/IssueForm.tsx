"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Send } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { createIssueAction, type IssueFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Btn disabled={pending}><Send className="h-4 w-4" /> {pending ? "Submitting..." : "Submit"}</Btn>;
}

export function IssueForm({ leading }: { leading?: ReactNode } = {}) {
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<IssueFormState, FormData>(createIssueAction, {});
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (state.ok) {
      setShowForm(false);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
        {leading}
        <Btn onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Raise issue</Btn>
      </div>
      {state.ok && !showForm && <div className="night-panel mb-4 rounded-2xl p-4 text-sm text-success">Issue submitted.</div>}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New issue">
        <form ref={formRef} action={formAction}>
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <input name="title" required placeholder="Brief title — what's broken?" className="rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-secondary/55" />
            <select name="category" className="rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition focus:border-secondary/55">
              <option>Registration</option><option>Payment</option><option>Booking</option><option>Access</option><option>Other</option>
            </select>
          </div>
          <textarea name="body" rows={4} placeholder="Details, screenshots, steps to reproduce…" className="mt-3 w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-secondary/55" />
          {state.error && <p className="mt-2 text-xs text-destructive">{state.error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Btn type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
            <SubmitButton />
          </div>
        </form>
      </Modal>
    </>
  );
}
