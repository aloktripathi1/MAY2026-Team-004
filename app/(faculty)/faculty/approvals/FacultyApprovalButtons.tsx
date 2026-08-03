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

  function decide(approval: "approved" | "rejected", label: string, force = false) {
    startTransition(async () => {
      try {
        await facultySetEventApprovalAction(eventId, approval, force);
        setChoice(label);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update approval.";
        // Registered-participants guard on approved -> rejected (#119): ask
        // once, then retry with force instead of silently doing nothing.
        if (!force && /already registered/.test(message) && window.confirm(`${message}\n\nReject anyway?`)) {
          decide(approval, label, true);
        } else if (force || !/already registered/.test(message)) {
          window.alert(message);
        }
      }
    });
  }

  // Full-width, equal-width side-by-side on mobile (a right-aligned vertical
  // stack read as floating/misaligned once the parent grid collapses to a
  // single column on narrow screens); md+ restores the original layout.
  const containerClass =
    layout === "horizontal"
      ? "grid grid-cols-2 gap-2 md:flex"
      : "grid grid-cols-2 gap-2 md:flex md:flex-col md:items-end";

  return (
    <div className={containerClass}>
      <Btn size="sm" className="w-full md:w-auto" disabled={Boolean(choice) || pending} onClick={() => decide("approved", "Approved")}>
        <Check className="h-4 w-4" /> {choice ?? "Approve"}
      </Btn>
      <Btn
        size="sm"
        variant="outline"
        disabled={Boolean(choice) || pending}
        onClick={() => decide("rejected", "Rejected")}
        className={`w-full md:w-auto ${choice === "Rejected" ? "border-destructive/45 bg-destructive/[0.14] text-destructive" : ""}`}
      >
        <X className="h-4 w-4" /> {choice === "Rejected" ? choice : "Reject"}
      </Btn>
    </div>
  );
}
