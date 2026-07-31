"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Ticket } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { toggleCountMeInAction } from "./actions";

export function CountMeInButton({
  eventId, eventSlug, initialCountedIn, capacity, attendeeCount, isPast,
}: { eventId: string; eventSlug: string; initialCountedIn: boolean; capacity: number; attendeeCount: number; isPast: boolean }) {
  const [countedIn, setCountedIn] = useState(initialCountedIn);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await toggleCountMeInAction(eventId, eventSlug);
      setCountedIn((value) => !value);
    });
  }

  if (isPast && !countedIn) {
    return (
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
        This event has ended. Registration is closed.
      </div>
    );
  }

  return (
    <>
      <div className="grid">
        <div
          className={`col-start-1 row-start-1 ${countedIn ? "invisible pointer-events-none" : ""}`}
          aria-hidden={countedIn}
        >
          <div className="text-3xl font-black tracking-[-0.05em] text-white">Grab a spot.</div>
          <div className="mt-2 text-xs text-muted-foreground">{capacity - attendeeCount} of {capacity} left. Locks 2 hrs before start.</div>
        </div>
        <div
          className={`col-start-1 row-start-1 ${countedIn ? "" : "invisible pointer-events-none"}`}
          aria-hidden={!countedIn}
        >
          <div className="flex items-center gap-2 text-secondary">
            <CheckCircle2 className="h-5 w-5" /> <span className="font-medium">You're in</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">Confirmation sent to your institutional email. Add to calendar from your dashboard.</div>
        </div>
      </div>
      {countedIn ? (
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
