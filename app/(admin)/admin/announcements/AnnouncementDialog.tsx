"use client";

import { Plus } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { AnnouncementForm } from "./AnnouncementForm";

export function NewAnnouncementButton({ onClick }: { onClick: () => void }) {
  return (
    <Btn size="sm" onClick={onClick}>
      <Plus className="h-4 w-4" /> New announcement
    </Btn>
  );
}

export function AnnouncementDialog({ open, onClose, memberCount }: { open: boolean; onClose: () => void; memberCount: number }) {
  return (
    <Modal open={open} onClose={onClose} title="New Announcement">
      <AnnouncementForm memberCount={memberCount} onSuccess={onClose} />
    </Modal>
  );
}
