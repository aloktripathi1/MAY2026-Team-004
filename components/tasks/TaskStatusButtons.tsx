"use client";

import { useState, useTransition } from "react";
import { updateTaskStatusAction } from "@/lib/actions/tasks";

const statuses = ["todo", "doing", "done"] as const;

export function TaskStatusButtons({ taskId, status }: { taskId: string; status: string }) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [pending, startTransition] = useTransition();

  function set(s: string) {
    startTransition(async () => {
      await updateTaskStatusAction(taskId, s);
      setCurrentStatus(s);
    });
  }

  return (
    <div className="flex gap-1.5">
      {statuses.map((s) => (
        <button
          key={s}
          title={taskId}
          disabled={pending}
          onClick={() => set(s)}
          className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider transition disabled:opacity-50 ${currentStatus === s ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground hover:text-foreground"}`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
