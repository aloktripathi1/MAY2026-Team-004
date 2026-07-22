"use client";

import { useEffect, useState, useTransition } from "react";
import { updateTaskStatusAction } from "@/lib/actions/tasks";

const statuses = ["todo", "doing", "done"] as const;

export function TaskStatusButtons({
  taskId,
  status,
  onStatusChange,
}: {
  taskId: string;
  status: string;
  onStatusChange?: (status: string) => void;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  function set(s: string) {
    startTransition(async () => {
      await updateTaskStatusAction(taskId, s);
      setCurrentStatus(s);
      onStatusChange?.(s);
    });
  }

  return (
    <div className="grid grid-cols-3 gap-1 w-full">
      {statuses.map((s) => (
        <button
          key={s}
          title={taskId}
          disabled={pending}
          onClick={() => set(s)}
          className={`w-full text-center rounded-md px-1 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider transition disabled:opacity-50 ${
            currentStatus === s
              ? "bg-secondary text-secondary-foreground"
              : "border border-white/10 bg-white/[0.035] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
