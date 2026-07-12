"use client";

import { useState, useTransition } from "react";
import { toggleJoinRequestAction } from "./actions";

export function JoinRequestButton({
  clubId,
  initialRequested,
}: {
  clubId: string;
  initialRequested: boolean;
}) {
  const [requested, setRequested] = useState(initialRequested);
  const [pending, startTransition] = useTransition();
  const [fading, setFading] = useState(false);

  function toggle() {
    if (pending || fading) return;

    startTransition(async () => {
      setFading(true);
      const minFade = new Promise((resolve) => setTimeout(resolve, 180));
      await Promise.all([toggleJoinRequestAction(clubId), minFade]);
      setRequested((value) => !value);
      // Let the new label paint before fading back in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFading(false));
      });
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || fading}
      aria-pressed={requested}
      className={`mt-4 w-full rounded-lg border py-2 text-xs font-semibold transition-[border-color,background-color,color,opacity,transform] duration-300 ease-out disabled:pointer-events-none ${
        requested
          ? "border-secondary/35 bg-white/[0.06] text-secondary"
          : "border-white/[0.12] bg-white/[0.035] text-white/[0.78] hover:border-secondary/35 hover:bg-white/[0.06] hover:text-secondary"
      } ${fading || pending ? "scale-[0.99] opacity-55" : "scale-100 opacity-100"}`}
    >
      <span
        className={`inline-block transition-[opacity,transform] duration-300 ease-out ${
          fading ? "translate-y-0.5 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        {requested ? "Requested" : "Request to join"}
      </span>
    </button>
  );
}
