import type { Metadata } from "next";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, Stat, StatusPill } from "@/components/ui/primitives";
import { TaskStatusButtons } from "@/components/tasks/TaskStatusButtons";

export const metadata: Metadata = {
  title: "My tasks · Sangam",
  description: "Your volunteer tasks.",
};

export default async function VolunteerHome() {
  const session = getMockSession();
  const tasks = await prisma.task.findMany({
    where: { assigneeId: session!.user.id },
    orderBy: { dueAt: "asc" },
    include: { event: true },
  });

  const open = tasks.filter((t) => t.status !== "done").length;
  const doing = tasks.filter((t) => t.status === "doing").length;

  return (
    <>
      <PageHeader eyebrow="Assigned to you" title={<>Your <span className="text-secondary">to-do list.</span></>} description="Update status inline. Coordinators see the state change without another message." />
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Open" value={open} hue="122" />
        <Stat label="Doing now" value={doing} hue="45" />
        <Stat label="Completed" value={tasks.length - open} hue="155" />
      </div>
      <div className="mt-8 space-y-2">
        {tasks.length === 0 && <div className="night-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">No tasks assigned yet.</div>}
        {tasks.map(t => (
          <GlassCard key={t.id} className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className={`h-2 w-2 shrink-0 rounded-full ${t.status === "done" ? "bg-success" : t.status === "doing" ? "bg-warning" : "bg-muted-foreground"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-mono-label mb-1">{t.event.title} / due {t.dueAt ? t.dueAt.toLocaleDateString() : "—"}</div>
                <div className="text-sm font-medium text-white">{t.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">Role: {t.role}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={t.status === "done" ? "green" : t.status === "doing" ? "amber" : "slate"}>{t.status}</StatusPill>
                <TaskStatusButtons taskId={t.id} status={t.status} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </>
  );
}
