"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ChevronDown, UserPlus } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { addMemberAction, type MemberFormState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Btn disabled={pending}>
      <UserPlus className="h-4 w-4" /> {pending ? "Adding…" : "Add member"}
    </Btn>
  );
}

export function AddMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<MemberFormState, FormData>(addMemberAction, {});
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (state.ok) {
      formRef.current?.reset();
      onClose();
    }
  }, [state, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Add member">
      <form ref={formRef} action={formAction}>
        <Field label="Full name" name="name" placeholder="Ananya Rao" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Roll number" name="roll" placeholder="23s1000123" />
          <label className="block">
            <div className="text-mono-label mb-1.5">Role</div>
            <div className="relative">
              <select
                name="role"
                defaultValue="Member"
                className="w-full appearance-none rounded-xl border border-white/[0.12] bg-white/[0.035] py-2.5 pl-4 pr-9 text-sm text-white outline-none transition focus:border-secondary/55"
              >
                <option>Member</option>
                <option>Volunteer</option>
                <option>Coordinator</option>
                <option>Admin</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </label>
        </div>
        <div className="mt-3">
          <Field label="Institutional email" name="email" type="email" placeholder="23s1000123@ds.study.iitm.ac.in" />
        </div>
        {state.error && <p className="mt-3 text-xs text-destructive">{state.error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn>
          <SubmitButton />
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label, name, placeholder, type = "text",
}: { label: string; name: string; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <div className="text-mono-label mb-1.5">{label}</div>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-secondary/55"
      />
    </label>
  );
}
