"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { facultySetEventApprovalAction } from "@/lib/actions/approvals";

export function FacultyApprovalButtons({ eventId }: { eventId: string }) {
  const [choice, setChoice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(approval: "approved" | "rejected", label: string) {
    startTransition(async () => {
      await facultySetEventApprovalAction(eventId, approval);
      setChoice(label);
    });
  }

  return (
    <div className="flex gap-2">
      <Btn size="sm" disabled={Boolean(choice) || pending} onClick={() => decide("approved", "Approved")}>
        <Check className="h-4 w-4" /> {choice ?? "Approve"}
      </Btn>
      <Btn
        size="sm"
        variant="outline"
        disabled={Boolean(choice) || pending}
        onClick={() => decide("rejected", "Rejected")}
        className={choice === "Rejected" ? "border-destructive/45 bg-destructive/[0.14] text-destructive" : ""}
      >
        <X className="h-4 w-4" /> {choice === "Rejected" ? choice : "Reject"}
      </Btn>
    </div>
  );
}
