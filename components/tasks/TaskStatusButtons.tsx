"use client";

import { useTransition } from "react";
import { updateTaskStatusAction } from "@/lib/actions/tasks";

const statuses = ["todo", "doing", "done"] as const;

export function TaskStatusButtons({ taskId, status }: { taskId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  function set(s: string) {
    startTransition(async () => {
      await updateTaskStatusAction(taskId, s);
    });
  }

  return (
    <div className="flex gap-1.5">
      {statuses.map((s) => (
        <button
          key={s}
          disabled={pending}
          onClick={() => set(s)}
          className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider transition ${status === s ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground hover:text-foreground"}`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
