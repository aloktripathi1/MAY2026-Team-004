"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ImagePlus, Plus, X } from "lucide-react";
import { Btn, StatusPill } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { submitClubRequestAction, type ClubRequestState } from "./club-request-actions";

const initialState: ClubRequestState = {};

const CATEGORIES = ["Technical", "Cultural", "Sports", "Entrepreneurship", "Literary", "Social", "Design"];

export type MyClubRequest = {
  id: string;
  name: string;
  status: string;
  reviewNote: string | null;
  clubSlug: string | null;
};

function tone(status: string): "green" | "amber" | "magenta" {
  if (status === "Approved") return "green";
  if (status === "Rejected") return "magenta";
  return "amber";
}

export function ProposeClub({ myRequests }: { myRequests: MyClubRequest[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(submitClubRequestAction, initialState);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Close on success, but keep the confirmation visible on the page behind it.
  if (state.ok && open) setOpen(false);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function handlePhotoChange(file: File | null) {
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function clearPhoto() {
    if (photoInputRef.current) photoInputRef.current.value = "";
    handlePhotoChange(null);
  }

  return (
    <>
      <div className="mb-5 night-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Can't find your club?</div>
            <p className="text-xs text-muted-foreground">
              Propose it. Faculty review new clubs, and if yours is approved you become its first admin.
            </p>
          </div>
          <Btn size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Propose a club
          </Btn>
        </div>

        {state.message && <p className="mt-3 text-xs text-secondary">{state.message}</p>}

        {myRequests.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-hairline pt-3">
            {myRequests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 text-xs">
                <StatusPill tone={tone(r.status)}>{r.status}</StatusPill>
                <span className="font-medium">{r.name}</span>
                {r.status === "Approved" && r.clubSlug && (
                  <span className="text-muted-foreground">· now live, you're its admin</span>
                )}
                {r.status === "Rejected" && r.reviewNote && (
                  <span className="text-muted-foreground">· {r.reviewNote}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Propose a new club" maxWidth="max-w-2xl">
        <form action={formAction} className="space-y-3">
          <Field label="Club name" name="name" placeholder="Photon - Robotics & Electronics" />
          <Field label="Tagline" name="tagline" placeholder="Bots, boards, and Saturday build nights." />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <div className="text-mono-label mb-1.5">Category</div>
              <select
                name="category"
                required
                defaultValue=""
                className="h-11 w-full appearance-none rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 text-sm text-white outline-none transition focus:border-secondary/55"
              >
                <option value="" disabled>Choose a category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <Field label="Symbol (optional)" name="emoji" placeholder="⚡" required={false} />
          </div>

          <label className="block">
            <div className="text-mono-label mb-1.5">What the club does</div>
            <textarea
              name="description"
              required
              rows={4}
              minLength={60}
              maxLength={1200}
              placeholder="What you'll run, how often, and who it's for. Faculty read this to decide."
              className="w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition focus:border-secondary/55"
            />
          </label>

          <div>
            <div className="text-mono-label mb-1.5">Club photo (optional)</div>
            {photoPreview ? (
              <div className="group relative h-28 w-full overflow-hidden rounded-xl border border-white/[0.12]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={clearPhoto}
                  aria-label="Remove photo"
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.16] bg-white/[0.02] text-muted-foreground transition hover:border-secondary/45 hover:bg-white/[0.04] hover:text-secondary"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-xs">Click to upload a photo</span>
              </button>
            )}
            <input
              ref={photoInputRef}
              type="file"
              name="photo"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
            />
            <div className="mt-1.5 text-xs text-muted-foreground/70">PNG, JPEG, WEBP, or GIF. Up to 5MB. Falls back to a gradient cover if skipped.</div>
          </div>

          {state.error && <p className="text-xs text-destructive">{state.error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Btn type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
            <SubmitButton />
          </div>
        </form>
      </Modal>
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Btn type="submit" disabled={pending}>{pending ? "Sending..." : "Send proposal"}</Btn>;
}

function Field({
  label, name, placeholder, required = true,
}: { label: string; name: string; placeholder: string; required?: boolean }) {
  return (
    <label className="block">
      <div className="text-mono-label mb-1.5">{label}</div>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 text-sm text-white outline-none transition focus:border-secondary/55"
      />
    </label>
  );
}
