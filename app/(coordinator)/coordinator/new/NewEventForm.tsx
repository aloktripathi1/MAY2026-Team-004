"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Btn } from "@/components/ui/primitives";
import { createEventAction, type NewEventState } from "./actions";

const initialState: NewEventState = {};

export function NewEventForm() {
  const [state, formAction] = useFormState(createEventAction, initialState);

  return (
    <form action={formAction}>
      <Field label="Title" name="title" placeholder="Cook-Off #43" />
      <Field label="Description" name="description" placeholder="What's it about? Who should show up?" area />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Date" name="date" type="date" />
        <Field label="Time" name="time" type="time" />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Venue" name="venue" placeholder="Amphitheatre" />
        <Field label="Capacity" name="capacity" type="number" placeholder="200" />
      </div>
      <div className="mt-6">
        <div className="text-mono-label mb-2">Tags</div>
        <div className="flex flex-wrap gap-1.5">
          {["Contest", "Music", "Debate", "Workshop", "Sponsored", "Off-campus", "Hybrid", "Online"].map(t => (
            <button key={t} type="button" className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs text-muted-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-primary">{t}</button>
          ))}
        </div>
      </div>
      {state.error && <p className="mt-3 text-xs text-destructive">{state.error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Btn disabled={pending}>{pending ? "Publishing…" : "Publish event"}</Btn>;
}

function Field({
  label, name, placeholder, type = "text", area,
}: { label: string; name: string; placeholder?: string; type?: string; area?: boolean }) {
  return (
    <label className="mt-4 block first:mt-0">
      <div className="text-mono-label mb-1.5">{label}</div>
      {area ? (
        <textarea name={name} required rows={4} placeholder={placeholder} className="w-full rounded-xl border border-hairline bg-surface/60 px-4 py-2.5 text-sm outline-none focus:border-primary/60" />
      ) : (
        <input name={name} required type={type} placeholder={placeholder} className="w-full rounded-xl border border-hairline bg-surface/60 px-4 py-2.5 text-sm outline-none focus:border-primary/60" />
      )}
    </label>
  );
}
