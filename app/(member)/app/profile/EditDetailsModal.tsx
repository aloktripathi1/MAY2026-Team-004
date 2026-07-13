"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Camera, X } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { INTEREST_OPTIONS } from "@/lib/interests";
import { updateProfileAction, type ProfileFormState } from "./actions";

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    if (file.size > 1024 * 1024) {
      reject(new Error("Image must be under 1MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

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
  image,
  initials,
}: {
  name: string;
  interests: string[];
  image: string | null;
  initials: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(interests);
  const [imageDraft, setImageDraft] = useState<string | null>(image);
  const [imageError, setImageError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useFormState<ProfileFormState, FormData>(updateProfileAction, {});
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (open) {
      setSelected(interests);
      setImageDraft(image);
      setImageError(null);
    }
  }, [open, interests, image]);

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

  async function onPick(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await readImageFile(file);
      setImageDraft(dataUrl);
      setImageError(null);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Could not read that image.");
    }
  }

  return (
    <>
      <Btn className="mt-6 w-full" variant="outline" onClick={() => setOpen(true)}>
        Edit details
      </Btn>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit details">
        <form ref={formRef} action={formAction}>
          <div className="mb-5">
            <div className="text-mono-label mb-1.5">Profile picture</div>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0">
                {imageDraft ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageDraft}
                    alt="Profile preview"
                    className="h-20 w-20 rounded-2xl border border-secondary/25 object-cover"
                  />
                ) : (
                  <div className="grid h-20 w-20 place-items-center rounded-2xl border border-secondary/25 bg-secondary/[0.12] text-2xl font-semibold text-secondary">
                    {initials}
                  </div>
                )}
                {imageDraft && (
                  <button
                    type="button"
                    onClick={() => setImageDraft(null)}
                    aria-label="Remove profile picture"
                    className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-secondary/55 bg-secondary text-secondary-foreground shadow-[0_0_0_3px_oklch(0.105_0.01_285)] transition hover:brightness-110"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white/[0.78] transition hover:border-secondary/35 hover:bg-white/[0.06] hover:text-secondary"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {imageDraft ? "Replace photo" : "Upload photo"}
                </button>
                <p className="mt-2 text-xs text-muted-foreground">JPG or PNG, under 1MB.</p>
                {imageError && <p className="mt-1 text-xs text-destructive">{imageError}</p>}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void onPick(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <input type="hidden" name="image" value={imageDraft ?? ""} />
            </div>
          </div>

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
