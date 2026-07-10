"use client";

import { useState, useTransition } from "react";
import { Btn } from "@/components/ui/primitives";
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
      <Btn size="sm" variant="outline" onClick={toggle} disabled={pending} className="mt-4 w-full">
        {pending ? "Withdrawing..." : "Requested"}
      </Btn>
    );
  }

  return (
    <Btn size="sm" onClick={toggle} disabled={pending} className="mt-4 w-full">
      {pending ? "Requesting..." : "Request to join →"}
    </Btn>
  );
}
