"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Btn } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useFormState(assignTaskAction, {});
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (state.ok) {
      setIsOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <Btn size="sm" variant="outline" onClick={() => setIsOpen(true)}>
        Assign
      </Btn>

      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Assign a task">
        <p className="mb-4 text-sm text-muted-foreground break-words">
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
              <option value="" className="bg-[#0f0f14] text-white">Select an event…</option>
              {events.map((e) => (
                <option key={e.id} value={e.id} className="bg-[#0f0f14] text-white">
                  {e.title}
                </option>
              ))}
            </select>
          </div>

          {state.error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400 break-words">
              {state.error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <Btn type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Btn>
            <SubmitButton />
          </div>
        </form>
      </Modal>
    </>
  );
}
