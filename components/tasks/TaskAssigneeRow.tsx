"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { updateTaskStatusAction } from "@/backend/domain/tasks";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { formatTaskDue, formatTaskStatus } from "@/lib/format";
import { cn } from "@/lib/utils";

function priorityTone(priority: string): "magenta" | "amber" | "slate" {
  if (priority === "High") return "magenta";
  if (priority === "Med") return "amber";
  return "slate";
}

function statusTone(status: string): "green" | "amber" | "slate" {
  if (status === "done") return "green";
  if (status === "doing") return "amber";
  return "slate";
}

function nextStatus(status: string): "todo" | "doing" | "done" {
  if (status === "todo") return "doing";
  if (status === "doing") return "done";
  return "todo";
}

export function TaskAssigneeRow({
  taskId,
  title,
  priority,
  status,
  dueAt,
  eventTitle,
  onStatusChange,
}: {
  taskId: string;
  title: string;
  priority: string;
  status: string;
  dueAt: Date | null;
  eventTitle: string;
  onStatusChange?: (status: "todo" | "doing" | "done") => void;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [pending, startTransition] = useTransition();
  const done = currentStatus === "done";

  function setStatus(next: "todo" | "doing" | "done") {
    // Move the card between sections immediately; persist in the background.
    setCurrentStatus(next);
    onStatusChange?.(next);
    startTransition(async () => {
      await updateTaskStatusAction(taskId, next);
    });
  }

  return (
    <GlassCard
      hover={false}
      className={cn("p-4 transition", done && "border-success/25 bg-success/[0.04]")}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          aria-label={done ? `Mark "${title}" as to do` : `Mark "${title}" as done`}
          disabled={pending}
          onClick={() => setStatus(done ? "todo" : "done")}
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition disabled:opacity-50",
            done
              ? "border-success/50 bg-success text-background"
              : "border-white/20 bg-white/[0.035] text-transparent hover:border-secondary/50",
          )}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className={cn("text-sm font-semibold text-white", done && "text-white/70 line-through")}>
              {title}
            </div>
            <StatusPill tone={priorityTone(priority)}>
              {priority === "Med" ? "Medium" : priority}
            </StatusPill>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-[0.08em]">{formatTaskDue(dueAt)}</span>
            <span className="mx-2 text-white/20">·</span>
            <span>{eventTitle}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={pending}
          title="Cycle status: To do → In progress → Done"
          onClick={() => setStatus(nextStatus(currentStatus))}
          className="inline-flex shrink-0 disabled:opacity-50"
        >
          <StatusPill tone={statusTone(currentStatus)}>{formatTaskStatus(currentStatus)}</StatusPill>
        </button>
      </div>
    </GlassCard>
  );
}
