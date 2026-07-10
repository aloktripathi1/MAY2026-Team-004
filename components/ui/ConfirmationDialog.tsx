"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  pending = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="inline-flex items-center gap-2">
          {destructive && <AlertTriangle className="h-4 w-4 text-destructive" />}
          {title}
        </span>
      }
      description={description}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Btn type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            {cancelLabel}
          </Btn>
          <Btn
            type="button"
            variant={destructive ? "hot" : "primary"}
            disabled={pending}
            onClick={async () => {
              await onConfirm();
            }}
          >
            {pending ? "Working..." : confirmLabel}
          </Btn>
        </div>
      }
    >
      {children}
    </Modal>
  );
}
