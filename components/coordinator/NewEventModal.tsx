"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { NewEventForm } from "@/app/(coordinator)/coordinator/new/NewEventForm";

export function NewEventModal({
  variant = "primary", size, label = "New event", className,
}: { variant?: "primary" | "ghost" | "outline" | "hot"; size?: "sm"; label?: string; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Btn size={size} variant={variant} className={className} onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" /> {label}
      </Btn>

      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Publish a new event" maxWidth="max-w-2xl">
        <p className="mb-4 text-sm text-muted-foreground">
          Sangam will auto-check for venue clashes and update your club dashboard.
        </p>
        <NewEventForm onSuccess={() => setIsOpen(false)} />
      </Modal>
    </>
  );
}
