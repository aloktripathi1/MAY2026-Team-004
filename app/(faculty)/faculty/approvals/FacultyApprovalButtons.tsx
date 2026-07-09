"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { facultySetEventApprovalAction } from "@/lib/actions/approvals";

export function FacultyApprovalButtons({ eventId }: { eventId: string }) {
  const [choice, setChoice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      await facultySetEventApprovalAction(eventId, "approved");
      setChoice("Approved");
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Btn size="sm" disabled={Boolean(choice) || pending} onClick={approve}>
        <Check className="h-4 w-4" /> {choice ?? "Approve"}
      </Btn>
      <Btn size="sm" variant="outline" disabled>
        <X className="h-4 w-4" /> Reject
      </Btn>
    </div>
  );
}
