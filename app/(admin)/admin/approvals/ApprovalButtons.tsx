"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { setMembershipStatusAction, setEventApprovalAction } from "@/lib/actions/approvals";

export function MembershipApprovalButtons({ membershipId }: { membershipId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button
        disabled={pending}
        onClick={() => startTransition(() => setMembershipStatusAction(membershipId, "Active"))}
        className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        disabled={pending}
        onClick={() => startTransition(() => setMembershipStatusAction(membershipId, "Inactive"))}
        className="grid h-8 w-8 place-items-center rounded-full border border-hairline transition hover:bg-destructive/20 hover:text-destructive disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>
    </>
  );
}

export function EventApprovalButtons({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="mt-3 flex justify-end gap-2">
      <Btn size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => setEventApprovalAction(eventId, "pending"))}>
        Ask for changes
      </Btn>
      <Btn size="sm" disabled={pending} onClick={() => startTransition(() => setEventApprovalAction(eventId, "approved"))}>
        Approve
      </Btn>
    </div>
  );
}
