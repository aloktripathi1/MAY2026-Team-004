"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { ChevronDown, KeyRound } from "lucide-react";
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
  const router = useRouter();
  const [state, formAction] = useFormState<TransferState, FormData>(transferAdminAction, {});

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  if (state.ok) {
    return <div className="text-sm text-success">Transfer complete - the role change took effect immediately.</div>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="relative">
        <select name="successorMembershipId" required className="w-full appearance-none rounded-xl border border-white/[0.12] bg-white/[0.035] py-2.5 pl-4 pr-9 text-sm text-white outline-none transition focus:border-secondary/55">
          <option value="">Choose successor…</option>
          {candidates.map((c) => (
            <option key={c.membershipId} value={c.membershipId}>{c.name} - {c.role}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {state.error && <div className="text-xs text-destructive">{state.error}</div>}
      <SubmitButton />
    </form>
  );
}
