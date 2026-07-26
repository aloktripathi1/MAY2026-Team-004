"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { facultySetEventApprovalAction } from "@/backend/domain/approvals";

interface FacultyApprovalButtonsProps {
  eventId: string;
  layout?: "horizontal" | "vertical";
}

export function FacultyApprovalButtons({ eventId, layout = "vertical" }: FacultyApprovalButtonsProps) {
  const [choice, setChoice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(approval: "approved" | "rejected", label: string) {
    startTransition(async () => {
      await facultySetEventApprovalAction(eventId, approval);
      setChoice(label);
    });
  }

  const containerClass = layout === "horizontal" ? "flex gap-2" : "flex flex-col items-end gap-2";

  return (
    <div className={containerClass}>
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
