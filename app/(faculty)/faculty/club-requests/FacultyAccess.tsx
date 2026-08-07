"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTransition, useState } from "react";
import { UserMinus } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { grantFacultyAction, revokeFacultyAction, type ReviewState } from "./actions";

const initialState: ReviewState = {};

export type FacultyRow = { id: string; name: string; email: string; isSelf: boolean };

export function FacultyAccess({ faculty }: { faculty: FacultyRow[] }) {
  const [state, formAction] = useFormState(grantFacultyAction, initialState);
  const [pending, startTransition] = useTransition();
  const [revokeError, setRevokeError] = useState<string | null>(null);

  function revoke(userId: string) {
    setRevokeError(null);
    startTransition(async () => {
      const result = await revokeFacultyAction(userId);
      if (result.error) setRevokeError(result.error);
    });
  }

  return (
    <div className="night-panel rounded-2xl p-6">
      <div className="text-mono-label mb-1">Faculty access</div>
      <p className="mb-4 text-sm text-muted-foreground">
        Faculty review events for every club and can appoint other faculty. The account must have signed up already.
      </p>

      <form action={formAction} className="flex flex-wrap gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="colleague@ds.study.iitm.ac.in"
          className="min-w-[240px] flex-1 rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition focus:border-secondary/55"
        />
        <GrantButton />
      </form>

      {state.error && <p className="mt-3 text-xs text-destructive">{state.error}</p>}
      {state.message && <p className="mt-3 text-xs text-secondary">{state.message}</p>}
      {revokeError && <p className="mt-3 text-xs text-destructive">{revokeError}</p>}

      <ul className="mt-5 divide-y divide-hairline border-t border-hairline">
        {faculty.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="font-medium">{f.name}</span>
              {f.isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
              <span className="block truncate text-xs text-muted-foreground">{f.email}</span>
            </span>
            {!f.isSelf && (
              <button
                type="button"
                onClick={() => revoke(f.id)}
                disabled={pending}
                aria-label={`Remove faculty access from ${f.name}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.12] px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-destructive/45 hover:text-destructive disabled:opacity-60"
              >
                <UserMinus className="h-3.5 w-3.5" /> Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GrantButton() {
  const { pending } = useFormStatus();
  return (
    <Btn type="submit" disabled={pending}>
      {pending ? "Granting..." : "Grant faculty access"}
    </Btn>
  );
}
