import type { Metadata } from "next";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard } from "@/components/ui/primitives";
import { TaskStatusButtons } from "@/components/tasks/TaskStatusButtons";
import { AssignTaskModal } from "@/components/coordinator/AssignTaskModal";

export const metadata: Metadata = {
  title: "Volunteers · Sangam",
  description: "Assign and track volunteer tasks.",
};

const columns = ["todo", "doing", "done"] as const;
const columnLabels: Record<(typeof columns)[number], string> = { todo: "To do", doing: "Doing", done: "Done" };

export default async function VolunteersPage() {
  const session = getMockSession();
  const membership = getPrimaryClubMembership(session!, "Coordinator");
  const clubId = membership!.clubId;

  const [team, events] = await Promise.all([
    prisma.membership.findMany({
      where: { clubId, role: "Volunteer" },
      include: { user: true },
      take: 6,
    }),
    prisma.event.findMany({ where: { clubId }, select: { id: true, title: true }, orderBy: { date: "asc" } }),
  ]);

  const eventIds = events.map(e => e.id);
  const tasks = await prisma.task.findMany({
    where: { eventId: { in: eventIds } },
    include: { event: true, assignee: true },
  });


  return (
    <>
      <PageHeader title={<>Volunteers <span className="text-secondary">on deck.</span></>} description="Assign tasks inline, update status as work moves through the board." />
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        {/* Team column */}
        <div>
          <div className="text-mono-label mb-3">Team</div>
          <div className="space-y-2">
            {team.length === 0 && <div className="text-sm text-muted-foreground">No volunteers yet.</div>}
            {team.map(m => (
              <GlassCard key={m.id} hover={false} className="flex items-center gap-3 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/15 text-xs font-semibold text-white">
                  {m.user.name.split(" ").map(s => s[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.user.name}</div>
                  <div className="text-xs text-muted-foreground">{m.role}</div>
                </div>
                <AssignTaskModal
                  assigneeId={m.user.id}
                  assigneeName={m.user.name}
                  events={events}
                />
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Task board */}
        <div>
          <div className="text-mono-label mb-3">Task board</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {columns.map(col => (
              <div key={col} className="night-panel rounded-2xl p-4">
                <div className="text-mono-label mb-3 flex items-center justify-between">
                  <span>{columnLabels[col]}</span>
                  <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs">{tasks.filter(t => t.status === col).length}</span>
                </div>
                <div className="space-y-2">
                  {tasks.filter(t => t.status === col).length === 0 && (
                    <div className="rounded-xl border border-dashed border-hairline p-4 text-center text-xs text-muted-foreground">Nothing here.</div>
                  )}
                  {tasks.filter(t => t.status === col).map(t => (
                    <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                      <div className="text-sm font-medium leading-snug">{t.title}</div>
                      <div className="text-mono-label mt-1 line-clamp-2">{events.find(e => e.id === t.eventId)?.title ?? "-"}</div>
                      <div className="mt-3 truncate text-xs text-muted-foreground">{t.assignee?.name ?? team.find(m => m.user.id === t.assigneeId)?.user.name ?? "-"}</div>
                      <div className="mt-2">
                        <TaskStatusButtons taskId={t.id} status={t.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
