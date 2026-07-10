"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { setMembershipStatusAction, setEventApprovalAction } from "@/lib/actions/approvals";

export function MembershipApprovalButtons({ membershipId }: { membershipId: string }) {
  const [choice, setChoice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(status: "Active" | "Inactive", label: string) {
    startTransition(async () => {
      await setMembershipStatusAction(membershipId, status);
      setChoice(label);
    });
  }

  return (
    <>
      <button
        disabled={Boolean(choice) || pending}
        title={choice ?? membershipId}
        onClick={() => decide("Active", "Approved")}
        className="gold-cta grid h-8 w-8 place-items-center rounded-lg text-secondary-foreground transition disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        disabled={Boolean(choice) || pending}
        title={choice ?? membershipId}
        onClick={() => decide("Inactive", "Rejected")}
        className="grid h-8 w-8 place-items-center rounded-lg border border-white/12 bg-white/[0.035] transition hover:border-destructive/45 hover:bg-destructive/14 hover:text-destructive disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>
    </>
  );
}

export function EventApprovalButtons({ eventId }: { eventId: string }) {
  const [choice, setChoice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      await setEventApprovalAction(eventId, "approved");
      setChoice("Approved");
    });
  }

  return (
    <div className="mt-3 flex justify-end gap-2">
      <Btn size="sm" variant="outline" disabled>
        Ask for changes
      </Btn>
      <Btn size="sm" disabled={Boolean(choice) || pending} onClick={approve}>
        {choice ?? "Approve"}
      </Btn>
    </div>
  );
}
