"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Btn } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { updateEventAction, type EditEventState } from "./actions";

type EventDetails = {
  id: string;
  slug: string;
  title: string;
  description: string;
  isoDate: string;
  time: string;
  venue: string;
  capacity: number;
  tags: string[] | string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Btn disabled={pending}>{pending ? "Saving…" : "Save changes"}</Btn>;
}

export function EditDetailsButton({ event }: { event: EventDetails }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const action = updateEventAction.bind(null, event.id, event.slug);
  const [state, formAction] = useFormState<EditEventState, FormData>(action, {});
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  const tags = Array.isArray(event.tags) ? event.tags.join(",") : event.tags;

  return (
    <>
      <Btn size="sm" variant="outline" onClick={() => setOpen(true)}>
        Edit details
      </Btn>

      <Modal open={open} onClose={() => setOpen(false)} title="Edit event details">
        <form ref={formRef} action={formAction} className="flex flex-col gap-5">
          <label className="block w-full">
            <div className="text-mono-label mb-1.5">Title</div>
            <input name="title" required defaultValue={event.title} className="h-11 w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 text-sm text-white outline-none transition focus:border-secondary/55" />
          </label>
          <label className="block w-full">
            <div className="text-mono-label mb-1.5">Description</div>
            <textarea name="description" required rows={3} defaultValue={event.description} className="w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition focus:border-secondary/55" />
          </label>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block w-full">
              <div className="text-mono-label mb-1.5">Date</div>
              <input name="date" type="date" required defaultValue={event.isoDate} className="h-11 w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 text-sm text-white outline-none transition focus:border-secondary/55 [color-scheme:dark]" />
            </label>
            <label className="block w-full">
              <div className="text-mono-label mb-1.5">Time</div>
              <input name="time" type="time" required defaultValue={event.time} className="h-11 w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 text-sm text-white outline-none transition focus:border-secondary/55 [color-scheme:dark]" />
            </label>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block w-full">
              <div className="text-mono-label mb-1.5">Venue</div>
              <input name="venue" required defaultValue={event.venue} className="h-11 w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 text-sm text-white outline-none transition focus:border-secondary/55" />
            </label>
            <label className="block w-full">
              <div className="text-mono-label mb-1.5">Capacity</div>
              <input name="capacity" type="number" required defaultValue={event.capacity} className="h-11 w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 text-sm text-white outline-none transition focus:border-secondary/55" />
            </label>
          </div>
          <input type="hidden" name="tags" value={tags} />
          {state.error && <p className="text-xs text-destructive">{state.error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Btn type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
            <SubmitButton />
          </div>
        </form>
      </Modal>
    </>
  );
}
