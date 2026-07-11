"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Btn } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { INTEREST_OPTIONS } from "@/lib/interests";
import { updateProfileAction, type ProfileFormState } from "./actions";

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Btn type="submit" disabled={pending || disabled} className="w-full sm:w-auto">
      {pending ? "Saving…" : "Save changes"}
    </Btn>
  );
}

export function EditDetailsModal({
  name,
  interests,
}: {
  name: string;
  interests: string[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(interests);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<ProfileFormState, FormData>(updateProfileAction, {});
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (open) setSelected(interests);
  }, [open, interests]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (state.ok) setOpen(false);
  }, [state]);

  function toggleInterest(interest: string) {
    setSelected((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : current.length >= 5
          ? current
          : [...current, interest],
    );
  }

  return (
    <>
      <Btn className="mt-6 w-full" variant="outline" onClick={() => setOpen(true)}>
        Edit details
      </Btn>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit details">
        <form ref={formRef} action={formAction}>
          <label className="block">
            <div className="text-mono-label mb-1.5">Name</div>
            <input
              name="name"
              required
              defaultValue={name}
              key={name}
              placeholder="Your full name"
              className="w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-secondary/55"
            />
          </label>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div className="text-mono-label">Interests</div>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {selected.length}/5
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {INTEREST_OPTIONS.map((interest) => {
                const active = selected.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    aria-pressed={active}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition duration-200 active:scale-[0.99] ${
                      active
                        ? "border-secondary/45 bg-secondary/[0.14] text-secondary"
                        : "border-white/[0.12] bg-white/[0.035] text-muted-foreground hover:border-white/[0.22] hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
            {selected.map((interest) => (
              <input key={interest} type="hidden" name="interests" value={interest} />
            ))}
          </div>

          {state.error && (
            <p className="mt-3 text-xs text-destructive">{state.error}</p>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Btn type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <SaveButton disabled={selected.length === 0} />
          </div>
        </form>
      </Modal>
    </>
  );
}
