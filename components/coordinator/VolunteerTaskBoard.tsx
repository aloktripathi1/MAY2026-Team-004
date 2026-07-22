"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { TaskStatusButtons } from "@/components/tasks/TaskStatusButtons";

type TaskItem = {
  id: string;
  title: string;
  eventId: string;
  role: string;
  dueAt?: Date | null;
  status: string;
  assigneeId: string;
  assignee?: { id: string; name: string } | null;
};

type EventItem = { id: string; title: string };
type TeamMember = { id: string; user: { id: string; name: string } };

const columns = ["todo", "doing", "done"] as const;
const columnLabels: Record<(typeof columns)[number], string> = {
  todo: "To do",
  doing: "Doing",
  done: "Done",
};

export function VolunteerTaskBoard({
  initialTasks,
  events,
  team,
}: {
  initialTasks: TaskItem[];
  events: EventItem[];
  team: TeamMember[];
}) {
  const [todoSortOrder, setTodoSortOrder] = useState<"asc" | "desc">("asc");

  function toggleSort() {
    setTodoSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {columns.map((col) => {
        let colTasks = initialTasks.filter((t) => t.status === col);

        if (col === "todo") {
          colTasks = [...colTasks].sort((a, b) => {
            const cmp = a.title.localeCompare(b.title);
            return todoSortOrder === "asc" ? cmp : -cmp;
          });
        }

        return (
          <div key={col} className="night-panel flex flex-col rounded-2xl p-4">
            <div className="text-mono-label mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{columnLabels[col]}</span>
                <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs">
                  {colTasks.length}
                </span>
              </div>

              {col === "todo" && (
                <button
                  type="button"
                  onClick={toggleSort}
                  title={`Sort ${todoSortOrder === "asc" ? "Z-A" : "A-Z"}`}
                  className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-white/20 hover:text-white"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  <span>{todoSortOrder === "asc" ? "A-Z" : "Z-A"}</span>
                </button>
              )}
            </div>

            {/* Scrollable Container Sized for Exactly 2 Cards with Thin Scrollbar */}
            <div className="max-h-[310px] min-h-[160px] overflow-y-auto space-y-2 pr-2 pl-0.5 py-0.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-white/30">
              {colTasks.length === 0 && (
                <div className="rounded-xl border border-dashed border-hairline p-4 text-center text-xs text-muted-foreground">
                  Nothing here.
                </div>
              )}
              {colTasks.map((t) => {
                const assigneeName =
                  t.assignee?.name ?? team.find((m) => m.user.id === t.assigneeId)?.user.name ?? "-";
                const eventTitle = events.find((e) => e.id === t.eventId)?.title ?? "-";

                return (
                  <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3.5">
                    <div className="text-sm font-medium leading-snug">{t.title}</div>
                    <div className="text-mono-label mt-1 line-clamp-2">{eventTitle}</div>
                    <div className="mt-2.5 truncate text-xs text-muted-foreground">{assigneeName}</div>
                    <div className="mt-3 w-full">
                      <TaskStatusButtons taskId={t.id} status={t.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
