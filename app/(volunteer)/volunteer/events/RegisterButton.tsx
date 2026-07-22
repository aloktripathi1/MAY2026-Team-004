"use client";

import { useState, useTransition } from "react";
import { Btn } from "@/components/ui/primitives";
import { toggleCountMeInAction } from "@/lib/actions/countMeIn";

type RegisterState = "register" | "registered" | "full" | "closed";

const sizeClass = "h-7 min-w-[6.5rem]";

export function RegisterButton({
  eventId,
  eventSlug,
  initialRegistered,
  isFull,
  isClosed,
}: {
  eventId: string;
  eventSlug: string;
  initialRegistered: boolean;
  isFull: boolean;
  isClosed: boolean;
}) {
  const [registered, setRegistered] = useState(initialRegistered);
  const [pending, startTransition] = useTransition();

  const state: RegisterState = isClosed
    ? "closed"
    : registered
      ? "registered"
      : isFull
        ? "full"
        : "register";

  function toggle() {
    if (state === "full" || state === "closed") return;
    startTransition(async () => {
      await toggleCountMeInAction(eventId, eventSlug);
      setRegistered((value) => !value);
    });
  }

  if (state === "closed") {
    return (
      <Btn size="sm" variant="outline" disabled className={sizeClass}>
        Closed
      </Btn>
    );
  }

  if (state === "full") {
    return (
      <Btn size="sm" variant="outline" disabled className={sizeClass}>
        Full
      </Btn>
    );
  }

  if (state === "registered") {
    return (
      <Btn
        size="sm"
        variant="outline"
        onClick={toggle}
        disabled={pending}
        className={sizeClass}
        title="Click to cancel request"
      >
        {pending ? "…" : "Requested"}
      </Btn>
    );
  }

  return (
    <Btn size="sm" onClick={toggle} disabled={pending} className={`${sizeClass} border border-transparent`}>
      {pending ? "…" : "Register"}
    </Btn>
  );
}
