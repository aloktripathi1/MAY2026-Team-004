"use client";

import { useState, useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ImagePlus, X } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { createEventAction, type NewEventState } from "./actions";

const TAGS = ["Contest", "Music", "Debate", "Workshop", "Sponsored", "Off-campus", "Hybrid", "Online"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Btn disabled={pending}>{pending ? "Publishing..." : "Publish event"}</Btn>;
}

export function NewEventForm({ onSuccess }: { onSuccess?: () => void }) {
  const [tags, setTags] = useState<string[]>([]);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useFormState<NewEventState, FormData>(createEventAction, {});

  useEffect(() => {
    if (state.ok) {
      onSuccess?.();
    }
  }, [state, onSuccess]);

  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerPreview]);

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function handleBannerChange(file: File | null) {
    setBannerPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function clearBanner() {
    if (bannerInputRef.current) bannerInputRef.current.value = "";
    handleBannerChange(null);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Title" name="title" placeholder="Cook-Off #43" />
      <Field label="Description" name="description" placeholder="What's it about? Who should show up?" area />
      <div>
        <div className="text-mono-label mb-2">Banner image</div>
        {bannerPreview ? (
          <div className="group relative h-32 w-full overflow-hidden rounded-xl border border-white/[0.12]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerPreview} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={clearBanner}
              aria-label="Remove banner"
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.16] bg-white/[0.02] text-muted-foreground transition hover:border-secondary/45 hover:bg-white/[0.04] hover:text-secondary"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-xs">Click to upload a banner (optional)</span>
          </button>
        )}
        <input
          ref={bannerInputRef}
          type="file"
          name="banner"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => handleBannerChange(e.target.files?.[0] ?? null)}
        />
        <div className="mt-1.5 text-xs text-muted-foreground/70">PNG, JPEG, WEBP, or GIF. Up to 5MB. Falls back to a gradient cover if skipped.</div>
      </div>
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
        <textarea name={name} required rows={2} placeholder={placeholder} className="w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-secondary/55" />
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
