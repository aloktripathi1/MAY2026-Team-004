"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Btn } from "@/components/ui/primitives";
import { createEventAction, type NewEventState } from "./actions";

const TAGS = ["Contest", "Music", "Debate", "Workshop", "Sponsored", "Off-campus", "Hybrid", "Online"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Btn disabled={pending}>{pending ? "Publishing..." : "Publish event"}</Btn>;
}

export function NewEventForm() {
  const [tags, setTags] = useState<string[]>([]);
  const [state, formAction] = useFormState<NewEventState, FormData>(createEventAction, {});

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="Title" name="title" placeholder="Cook-Off #43" />
      <Field label="Description" name="description" placeholder="What's it about? Who should show up?" area />
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Date" name="date" type="date" />
        <Field label="Time" name="time" type="time" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Venue" name="venue" placeholder="Amphitheatre" />
        <Field label="Capacity" name="capacity" type="number" placeholder="200" />
      </div>
      <div>
        <div className="text-mono-label mb-2">Tags</div>
        <input type="hidden" name="tags" value={tags.join(",")} />
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map(t => {
            const selected = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                aria-pressed={selected}
                className={`h-8 rounded-lg border px-3 text-xs transition ${
                  selected
                    ? "border-secondary/55 bg-secondary/[0.12] text-secondary"
                    : "border-white/[0.12] bg-white/[0.035] text-muted-foreground hover:border-secondary/45 hover:bg-white/[0.06] hover:text-secondary"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <div className="mt-2 flex justify-end gap-2">
        <SubmitButton />
      </div>
    </form>
  );
}

function Field({
  label, name, placeholder, type = "text", area,
}: { label: string; name: string; placeholder?: string; type?: string; area?: boolean }) {
  const isDateOrTime = type === "date" || type === "time";
  return (
    <label className="block w-full">
      <div className="text-mono-label mb-1.5">{label}</div>
      {area ? (
        <textarea name={name} required rows={4} placeholder={placeholder} className="w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-secondary/55" />
      ) : (
        <input
          name={name}
          required
          type={type}
          placeholder={placeholder}
          className={`h-11 w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-secondary/55 ${isDateOrTime ? "[color-scheme:dark]" : ""}`}
        />
      )}
    </label>
  );
}
