"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Btn } from "@/components/ui/primitives";
import { assignTaskAction } from "@/app/(coordinator)/coordinator/volunteers/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Btn type="submit" variant="primary" disabled={pending}>
      {pending ? "Assigning..." : "Assign Task"}
    </Btn>
  );
}

type Event = { id: string; title: string };

export function AssignTaskModal({
  assigneeId,
  assigneeName,
  events,
}: {
  assigneeId: string;
  assigneeName: string;
  events: Event[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useFormState(assignTaskAction, {});

  // Close modal on success
  if (state.ok && isOpen) {
    setIsOpen(false);
    state.ok = false;
  }

  return (
    <>
      <Btn size="sm" variant="outline" onClick={() => setIsOpen(true)}>
        Assign
      </Btn>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="night-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10">
            <h2 className="mb-1 text-xl font-bold text-white">Assign a Task</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Assigning to <span className="font-medium text-secondary">{assigneeName}</span>
            </p>

            <form action={formAction} className="space-y-4">
              {/* Hidden field for assignee */}
              <input type="hidden" name="assigneeId" value={assigneeId} />

              <div>
                <label htmlFor="title" className="mb-1.5 block text-sm text-muted-foreground">
                  Task Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="e.g. Set up PA system"
                  required
                  className="w-full rounded-lg border border-white/12 bg-white/[0.035] px-3 py-2 text-sm text-white outline-none placeholder:text-muted-foreground/50 focus:border-secondary transition"
                />
              </div>

              <div>
                <label htmlFor="role" className="mb-1.5 block text-sm text-muted-foreground">
                  Role / Responsibility
                </label>
                <input
                  id="role"
                  name="role"
                  type="text"
                  placeholder="e.g. Tech ops, Logistics"
                  required
                  className="w-full rounded-lg border border-white/12 bg-white/[0.035] px-3 py-2 text-sm text-white outline-none placeholder:text-muted-foreground/50 focus:border-secondary transition"
                />
              </div>

              <div>
                <label htmlFor="eventId" className="mb-1.5 block text-sm text-muted-foreground">
                  Event
                </label>
                <select
                  id="eventId"
                  name="eventId"
                  required
                  className="w-full rounded-lg border border-white/12 bg-[#0f0f14] px-3 py-2 text-sm text-white outline-none focus:border-secondary transition"
                >
                  <option value="">Select an event…</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>

              {state.error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {state.error}
                </div>
              )}

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
