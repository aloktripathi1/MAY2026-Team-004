"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ChevronDown, ImagePlus, Plus, Send, X } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { createIssueAction, type IssueFormState } from "./actions";

const MAX_ATTACHMENTS = 4;

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Btn disabled={pending}><Send className="h-4 w-4" /> {pending ? "Submitting..." : "Submit"}</Btn>;
}

export function IssueForm({ leading }: { leading?: ReactNode } = {}) {
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useFormState<IssueFormState, FormData>(createIssueAction, {});
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (state.ok) {
      setShowForm(false);
      setShowSuccess(true);
      setAttachments([]);
      formRef.current?.reset();
    }
  }, [state]);

  function openForm() {
    setShowSuccess(false);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setShowSuccess(false);
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_ATTACHMENTS - attachments.length;
    Array.from(files).slice(0, remaining).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setAttachments((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        {leading}
        <Btn onClick={openForm}><Plus className="h-4 w-4" /> Raise issue</Btn>
      </div>
      {showSuccess && <div className="night-panel mb-4 rounded-2xl p-4 text-sm text-success">Issue submitted.</div>}
      <Modal open={showForm} onClose={closeForm} title="New issue">
        <form ref={formRef} action={formAction}>
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <input name="title" required placeholder="Brief title - what's broken?" className="rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-secondary/55" />
            <div className="relative">
              <select name="category" className="w-full appearance-none rounded-xl border border-white/[0.12] bg-white/[0.035] py-2.5 pl-4 pr-9 text-sm text-white outline-none transition focus:border-secondary/55">
                <option>Registration</option><option>Payment</option><option>Booking</option><option>Access</option><option>Other</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <textarea name="body" rows={4} placeholder="Details, steps to reproduce…" className="mt-3 w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-secondary/55" />

          <input type="hidden" name="attachments" value={JSON.stringify(attachments)} />

          <div className="mt-3">
            <div className="text-mono-label mb-2">Attachments</div>
            <div className="flex flex-wrap gap-2">
              {attachments.map((src, i) => (
                <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-white/[0.12]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    aria-label="Remove attachment"
                    className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {attachments.length < MAX_ATTACHMENTS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-white/[0.16] bg-white/[0.02] text-muted-foreground transition hover:border-secondary/45 hover:bg-white/[0.04] hover:text-secondary"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="mt-1.5 text-xs text-muted-foreground/70">Up to {MAX_ATTACHMENTS} screenshots.</div>
          </div>

          {state.error && <p className="mt-2 text-xs text-destructive">{state.error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Btn type="button" variant="ghost" onClick={closeForm}>Cancel</Btn>
            <SubmitButton />
          </div>
        </form>
      </Modal>
    </>
  );
}
