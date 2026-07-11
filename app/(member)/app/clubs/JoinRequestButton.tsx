"use client";

import { useState, useTransition } from "react";
import { toggleJoinRequestAction } from "./actions";

export function JoinRequestButton({
  clubId,
  initialRequested,
}: {
  clubId: string;
  initialRequested: boolean;
}) {
  const [requested, setRequested] = useState(initialRequested);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await toggleJoinRequestAction(clubId);
      setRequested((value) => !value);
    });
  }

  if (requested) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="mt-4 w-full rounded-lg border border-secondary/45 bg-secondary/[0.1] py-2 text-xs font-semibold text-secondary transition hover:bg-secondary/[0.16] disabled:opacity-60"
      >
        {pending ? "Withdrawing..." : "Requested"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="mt-4 w-full rounded-lg border border-white/[0.12] bg-white/[0.035] py-2 text-xs font-semibold text-white/[0.78] transition hover:border-secondary/35 hover:bg-white/[0.06] hover:text-secondary disabled:opacity-60"
    >
      {pending ? "Requesting..." : "Request to join →"}
    </button>
  );
}
