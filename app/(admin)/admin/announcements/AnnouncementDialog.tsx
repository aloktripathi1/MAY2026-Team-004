"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { AnnouncementForm } from "./AnnouncementForm";

export function AnnouncementDialog({ memberCount }: { memberCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Btn size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New announcement
      </Btn>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Announcement</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 hover:bg-white/[0.08]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AnnouncementForm memberCount={memberCount} onSuccess={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
