"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Ticket } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { toggleRsvpAction } from "./actions";

export function RsvpButton({
  eventId, eventSlug, initialRsvped, capacity, going,
}: { eventId: string; eventSlug: string; initialRsvped: boolean; capacity: number; going: number }) {
  const [rsvped, setRsvped] = useState(initialRsvped);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await toggleRsvpAction(eventId, eventSlug);
      setRsvped((value) => !value);
    });
  }

  return (
    <>
      <div className="grid">
        <div
          className={`col-start-1 row-start-1 ${rsvped ? "invisible pointer-events-none" : ""}`}
          aria-hidden={rsvped}
        >
          <div className="text-3xl font-black tracking-[-0.05em] text-white">Grab a spot.</div>
          <div className="mt-2 text-xs text-muted-foreground">{capacity - going} of {capacity} left. Locks 2 hrs before start.</div>
        </div>
        <div
          className={`col-start-1 row-start-1 ${rsvped ? "" : "invisible pointer-events-none"}`}
          aria-hidden={!rsvped}
        >
          <div className="flex items-center gap-2 text-secondary">
            <CheckCircle2 className="h-5 w-5" /> <span className="font-medium">You're in</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">Confirmation sent to your institutional email. Add to calendar from your dashboard.</div>
        </div>
      </div>
      {rsvped ? (
        <Btn size="lg" variant="outline" onClick={toggle} disabled={pending} className="mt-4 w-full">
          {pending ? "Cancelling..." : "Cancel"}
        </Btn>
      ) : (
        <Btn size="lg" onClick={toggle} disabled={pending} className="mt-4 w-full">
          <Ticket className="h-4 w-4" /> {pending ? "Count Me In..." : "Count Me In!"}
        </Btn>
      )}
    </>
  );
}
