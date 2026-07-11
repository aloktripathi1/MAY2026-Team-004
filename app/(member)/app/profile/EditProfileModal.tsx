"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Camera } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { updateProfileAction, type ProfileFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Btn disabled={pending}>{pending ? "Saving..." : "Save changes"}</Btn>;
}

export function EditProfileModal({
  open, onClose, initialName, initialImage, initials,
}: { open: boolean; onClose: () => void; initialName: string; initialImage?: string | null; initials: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | undefined>(initialImage ?? undefined);
  const [state, formAction] = useFormState<ProfileFormState, FormData>(updateProfileAction, {});
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (state.ok) onClose();
  }, [state, onClose]);

  useEffect(() => {
    if (open) setImage(initialImage ?? undefined);
  }, [open, initialImage]);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImage(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit profile">
      <form ref={formRef} action={formAction}>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border border-secondary/25 bg-secondary/[0.12] text-3xl font-semibold text-secondary"
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
            <div className="absolute inset-0 grid place-items-center bg-black/60 opacity-0 transition group-hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        <input type="hidden" name="image" value={image ?? ""} />

        <label className="mt-6 block">
          <div className="text-mono-label mb-1.5">Full name</div>
          <input
            name="name"
            required
            defaultValue={initialName}
            className="w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-secondary/55"
          />
        </label>

        {state.error && <p className="mt-2 text-xs text-destructive">{state.error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn>
          <SubmitButton />
        </div>
      </form>
    </Modal>
  );
}
