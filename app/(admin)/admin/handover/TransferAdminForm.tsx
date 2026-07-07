"use client";

import { useFormState, useFormStatus } from "react-dom";
import { KeyRound } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { transferAdminAction, type TransferState } from "./actions";

const initialState: TransferState = {};

export function TransferAdminForm({ candidates }: { candidates: { membershipId: string; name: string; role: string }[] }) {
  const [state, formAction] = useFormState(transferAdminAction, initialState);

  if (state.ok) {
    return <div className="text-sm text-success">Admin role transferred. You are now Coordinator for this club.</div>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <select name="successorMembershipId" required className="w-full rounded-xl border border-hairline bg-surface/60 px-4 py-2.5 text-sm outline-none focus:border-primary/60">
        <option value="">Choose successor…</option>
        {candidates.map((c) => (
          <option key={c.membershipId} value={c.membershipId}>{c.name} — {c.role}</option>
        ))}
      </select>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Btn size="sm" variant="outline" className="w-full" disabled={pending}>
      <KeyRound className="h-4 w-4" /> {pending ? "Transferring…" : "Transfer admin"}
    </Btn>
  );
}
