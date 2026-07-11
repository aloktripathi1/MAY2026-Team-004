"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { TaskAssigneeRow } from "@/components/tasks/TaskAssigneeRow";

export type AssignedTask = {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueAt: Date | string | null;
  eventTitle: string;
};

const ease = [0.22, 1, 0.36, 1] as const;

function dueTime(dueAt: Date | string | null) {
  if (!dueAt) return Number.POSITIVE_INFINITY;
  return new Date(dueAt).getTime();
}

function sortByDue(a: AssignedTask, b: AssignedTask) {
  return dueTime(a.dueAt) - dueTime(b.dueAt);
}

export function AssignedTasksBoard({ initialTasks }: { initialTasks: AssignedTask[] }) {
  const reduceMotion = useReducedMotion();
  const [tasks, setTasks] = useState(initialTasks);

  const { active, completed } = useMemo(() => {
    const activeTasks = tasks.filter((t) => t.status !== "done").sort(sortByDue);
    const completedTasks = tasks.filter((t) => t.status === "done").sort(sortByDue);
    return { active: activeTasks, completed: completedTasks };
  }, [tasks]);

  function handleStatusChange(taskId: string, status: string) {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status } : task)));
  }

  function renderList(items: AssignedTask[], emptyLabel: string) {
    if (items.length === 0) {
      return (
        <div className="night-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((task) => (
            <motion.div
              key={task.id}
              layout={!reduceMotion}
              layoutId={reduceMotion ? undefined : `task-card-${task.id}`}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { layout: { duration: 0.32, ease }, opacity: { duration: 0.18 }, scale: { duration: 0.18 } }
              }
            >
              <TaskAssigneeRow
                taskId={task.id}
                title={task.title}
                priority={task.priority}
                status={task.status}
                dueAt={task.dueAt ? new Date(task.dueAt) : null}
                eventTitle={task.eventTitle}
                onStatusChange={(status) => handleStatusChange(task.id, status)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="night-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">
        No tasks assigned yet.
      </div>
    );
  }

  const content = (
    <>
      <section>
        <div className="mb-4">
          <h2 className="text-mono-label">Assigned to me</h2>
        </div>
        {renderList(active, "No active tasks right now.")}
      </section>

      <section className="mt-10">
        <div className="mb-4">
          <h2 className="text-mono-label">Completed</h2>
        </div>
        {renderList(completed, "No completed tasks yet.")}
      </section>
    </>
  );

  if (reduceMotion) return content;

  return <LayoutGroup id="volunteer-assigned-tasks">{content}</LayoutGroup>;
}
