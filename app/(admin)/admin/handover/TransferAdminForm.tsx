"use client";

import { useFormState, useFormStatus } from "react-dom";
import { KeyRound } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { transferAdminAction, type TransferState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Btn size="sm" variant="outline" className="w-full" disabled={pending}>
      <KeyRound className="h-4 w-4" /> {pending ? "Transferring..." : "Transfer admin"}
    </Btn>
  );
}

export function TransferAdminForm({ candidates }: { candidates: { membershipId: string; name: string; role: string }[] }) {
  const [state, formAction] = useFormState<TransferState, FormData>(transferAdminAction, {});

  if (state.ok) {
    return <div className="text-sm text-success">Transfer complete — the role change took effect immediately.</div>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <select name="successorMembershipId" required className="w-full rounded-xl border border-hairline bg-surface/60 px-4 py-2.5 text-sm outline-none focus:border-primary/60">
        <option value="">Choose successor…</option>
        {candidates.map((c) => (
          <option key={c.membershipId} value={c.membershipId}>{c.name} — {c.role}</option>
        ))}
      </select>
      {state.error && <div className="text-xs text-destructive">{state.error}</div>}
      <SubmitButton />
    </form>
  );
}
