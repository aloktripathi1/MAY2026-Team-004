"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Send } from "lucide-react";
import { Btn, GlassCard } from "@/components/ui/primitives";
import { createIssueAction, type IssueFormState } from "./actions";

const initialState: IssueFormState = {};

export function IssueForm() {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useFormState(createIssueAction, initialState);

  useEffect(() => {
    if (state.ok) setShowForm(false);
  }, [state.ok]);

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Btn onClick={() => setShowForm(v => !v)}><Plus className="h-4 w-4" /> Raise issue</Btn>
      </div>
      {showForm && (
        <GlassCard className="glass-strong mb-6 p-6">
          <form action={formAction}>
            <div className="text-mono-label mb-3">New issue</div>
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <input name="title" required placeholder="Brief title — what's broken?" className="rounded-xl border border-hairline bg-surface/60 px-4 py-2.5 text-sm outline-none focus:border-primary/60" />
              <select name="category" className="rounded-xl border border-hairline bg-surface/60 px-4 py-2.5 text-sm outline-none focus:border-primary/60">
                <option>Registration</option><option>Payment</option><option>Booking</option><option>Access</option><option>Other</option>
              </select>
            </div>
            <textarea name="body" rows={4} placeholder="Details, screenshots, steps to reproduce…" className="mt-3 w-full rounded-xl border border-hairline bg-surface/60 px-4 py-2.5 text-sm outline-none focus:border-primary/60" />
            {state.error && <p className="mt-2 text-xs text-destructive">{state.error}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <Btn type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <SubmitButton />
            </div>
          </form>
        </GlassCard>
      )}
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Btn disabled={pending}><Send className="h-4 w-4" /> {pending ? "Submitting…" : "Submit"}</Btn>
  );
}
