"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { facultySetEventApprovalAction } from "@/lib/actions/approvals";

export function FacultyApprovalButtons({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col items-end gap-2">
      <Btn size="sm" disabled={pending} onClick={() => startTransition(() => facultySetEventApprovalAction(eventId, "approved"))}>
        <Check className="h-4 w-4" /> Approve
      </Btn>
      <Btn size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => facultySetEventApprovalAction(eventId, "pending"))}>
        <X className="h-4 w-4" /> Reject
      </Btn>
    </div>
  );
}
