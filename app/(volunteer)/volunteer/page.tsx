import type { Metadata } from "next";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, Stat, StatusPill } from "@/components/ui/primitives";
import { AssignedTasksBoard } from "@/components/tasks/AssignedTasksBoard";
import { formatContributionDate, pluralize } from "@/lib/format";

export const metadata: Metadata = {
  title: "My tasks · Sangam",
  description: "Your volunteer tasks.",
};

export default async function VolunteerHome() {
  const session = getMockSession();
  const userId = session!.user.id;

  const [tasks, contributions, rsvps] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: userId },
      orderBy: { dueAt: "asc" },
      include: { event: true },
    }),
    prisma.contribution.findMany({
      where: { userId },
      orderBy: { verifiedAt: "desc" },
      include: { event: true },
    }),
    prisma.rsvp.findMany({
      where: { userId },
    }),
  ]);

  const active = tasks.filter((t) => t.status !== "done").length;
  const completedTasks = tasks.filter((t) => t.status === "done");
  const done = completedTasks.length;
  const hoursLogged = contributions.reduce((sum, entry) => sum + Number(entry.hoursLogged), 0);

  const supportedEventIds = new Set<string>([
    ...tasks.map((t) => t.eventId),
    ...contributions.map((c) => c.eventId),
    ...rsvps.map((r) => r.eventId),
  ]);

  const assignedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority ?? "Med",
    status: t.status,
    dueAt: t.dueAt,
    eventTitle: t.event.title,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Volunteer"
        title={<>My <span className="text-secondary">tasks</span></>}
        description={`${active} active · ${done} done. Keep status updated so coordinators can plan.`}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Active tasks" value={active} />
        <Stat label="Events supported" value={supportedEventIds.size} />
        <Stat label="Hours contributed" value={`${hoursLogged}h`} />
      </div>

      <div className="mt-10">
        <AssignedTasksBoard initialTasks={assignedTasks} />
      </div>

      <section className="mt-10">
        <div className="mb-4">
          <h2 className="text-mono-label">Contribution record</h2>
          <p className="mt-2 text-sm text-muted-foreground">Your verified volunteering history and completed tasks.</p>
        </div>
        <div className="space-y-2">
          {contributions.length === 0 && completedTasks.length === 0 && (
            <div className="night-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">
              No verified hours or completed tasks yet.
            </div>
          )}
          {contributions.map((entry) => (
            <GlassCard key={entry.id} hover={false} className="overflow-hidden border-l border-l-[#2A2A2E] p-0">
              <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{entry.event.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {entry.role}
                    <span className="mx-2 text-white/20">·</span>
                    <span className="font-mono uppercase tracking-[0.08em]">
                      {formatContributionDate(entry.verifiedAt)}
                    </span>
                  </div>
                </div>
                <StatusPill tone="green">
                  {entry.hoursLogged}h logged
                </StatusPill>
              </div>
            </GlassCard>
          ))}
          {completedTasks.map((task) => (
            <GlassCard key={task.id} hover={false} className="overflow-hidden border-l border-l-[#2A2A2E] p-0">
              <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{task.event.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{task.title}</div>
                </div>
                <StatusPill tone="slate">Task completed</StatusPill>
              </div>
            </GlassCard>
          ))}
        </div>
        {(contributions.length > 0 || completedTasks.length > 0) && (
          <p className="mt-3 text-xs text-muted-foreground">
            {pluralize(contributions.length, "verified shift")} · {hoursLogged}h total
            {completedTasks.length > 0 && ` · ${pluralize(completedTasks.length, "completed task")}`}
          </p>
        )}
      </section>
    </>
  );
}
