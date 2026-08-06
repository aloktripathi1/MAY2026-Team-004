"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
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

  // Close on success, but keep the confirmation visible on the page behind it.
  if (state.ok && open) setOpen(false);

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

      <Modal open={open} onClose={() => setOpen(false)} title="Propose a new club">
        <form action={formAction} className="space-y-3">
          <Field label="Club name" name="name" placeholder="Photon - Robotics & Electronics" />
          <Field label="Tagline" name="tagline" placeholder="Bots, boards, and Saturday build nights." />

          <label className="block">
            <div className="text-mono-label mb-1.5">Category</div>
            <select
              name="category"
              required
              defaultValue=""
              className="w-full appearance-none rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition focus:border-secondary/55"
            >
              <option value="" disabled>Choose a category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

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

          <Field label="Symbol (optional)" name="emoji" placeholder="⚡" required={false} />

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
        className="w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition focus:border-secondary/55"
      />
    </label>
  );
}
