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
  const done = tasks.length - active;
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
        <Stat label="Active tasks" value={active} hue="122" />
        <Stat label="Events supported" value={supportedEventIds.size} hue="155" />
        <Stat label="Hours contributed" value={`${hoursLogged}h`} hue="210" />
      </div>

      <div className="mt-10">
        <AssignedTasksBoard initialTasks={assignedTasks} />
      </div>

      <section className="mt-10">
        <div className="mb-4">
          <h2 className="text-mono-label">Contribution record</h2>
          <p className="mt-2 text-sm text-muted-foreground">Your verified volunteering history.</p>
        </div>
        <div className="space-y-2">
          {contributions.length === 0 && (
            <div className="night-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">
              No verified hours yet.
            </div>
          )}
          {contributions.map((entry) => (
            <GlassCard key={entry.id} hover={false} className="overflow-hidden p-0">
              <div className="flex items-stretch gap-0">
                <div
                  className="w-1 shrink-0"
                  style={{ background: `oklch(0.72 0.14 ${entry.event.club?.hue ?? "122"})` }}
                  aria-hidden
                />
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
              </div>
            </GlassCard>
          ))}
        </div>
        {contributions.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {pluralize(contributions.length, "verified shift")} · {hoursLogged}h total
          </p>
        )}
      </section>
    </>
  );
}
