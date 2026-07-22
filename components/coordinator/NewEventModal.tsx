"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { NewEventForm } from "@/app/(coordinator)/coordinator/new/NewEventForm";

export function NewEventModal({ variant = "primary" }: { variant?: "primary" | "ghost" | "outline" | "hot" }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Btn variant={variant} onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" /> New event
      </Btn>

      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Publish a new event">
        <p className="mb-4 text-sm text-muted-foreground">
          Sangam will auto-check for venue clashes and update your club dashboard.
        </p>
        <NewEventForm onSuccess={() => setIsOpen(false)} />
      </Modal>
    </>
  );
}
