"use client";

import { useState } from "react";
import { Btn } from "@/components/ui/primitives";
import { updateProfileAction } from "@/app/(member)/app/profile/actions";
import { useFormState, useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Btn type="submit" variant="primary" disabled={pending}>
      {pending ? "Saving..." : "Save Changes"}
    </Btn>
  );
}

export function EditProfileModal({ initialName }: { initialName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useFormState(updateProfileAction, {});

  // Close modal when successful
  if (state.ok && isOpen) {
    setIsOpen(false);
    state.ok = false; // Reset so it can be opened again
  }

  return (
    <>
      <Btn className="mt-6 w-full" variant="outline" onClick={() => setIsOpen(true)}>
        Edit details
      </Btn>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="night-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10 relative">
            <h2 className="mb-4 text-xl font-bold text-white">Edit Profile</h2>
            
            <form action={formAction} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm text-muted-foreground">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={initialName}
                  required
                  className="w-full rounded-lg border border-white/12 bg-white/[0.035] px-3 py-2 text-white outline-none focus:border-secondary transition"
                />
              </div>

              {state.error && <div className="text-sm text-red-500">{state.error}</div>}

              <div className="mt-6 flex justify-end gap-3">
                <Btn type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                  Cancel
                </Btn>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
