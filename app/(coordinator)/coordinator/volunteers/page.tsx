import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, Btn } from "@/components/ui/primitives";
import { TaskStatusButtons } from "@/components/tasks/TaskStatusButtons";

export const metadata: Metadata = {
  title: "Volunteers · Sangam",
  description: "Assign and track volunteer tasks.",
};

const columns = ["todo", "doing", "done"] as const;
const columnLabels: Record<(typeof columns)[number], string> = { todo: "To do", doing: "Doing", done: "Done" };

export default async function VolunteersPage() {
  const session = await getServerSession(authOptions);
  const membership = getPrimaryClubMembership(session!, "Coordinator");
  const clubId = membership!.clubId;

  const [team, tasks] = await Promise.all([
    prisma.membership.findMany({
      where: { clubId, role: { in: ["Volunteer", "Member"] } },
      include: { user: true },
      take: 6,
    }),
    prisma.task.findMany({ where: { event: { clubId } }, include: { event: true, assignee: true } }),
  ]);

  return (
    <>
      <PageHeader eyebrow="People" title={<>Volunteers <span className="text-display text-primary italic">on deck.</span></>} description="Assign tasks inline, update status as work moves through the board." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <div className="text-mono-label mb-3">Team</div>
          <div className="space-y-2">
            {team.length === 0 && <div className="text-sm text-muted-foreground">No volunteers yet.</div>}
            {team.map(m => (
              <GlassCard key={m.id} className="flex items-center gap-3 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold bg-primary/15 text-primary">
                  {m.user.name.split(" ").map(s => s[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.user.name}</div>
                  <div className="text-xs text-muted-foreground">{m.role}</div>
                </div>
                <Btn size="sm" variant="outline">Assign</Btn>
              </GlassCard>
            ))}
          </div>
        </div>
        <div>
          <div className="text-mono-label mb-3">Task board</div>
          <div className="grid gap-3 md:grid-cols-3">
            {columns.map(col => (
              <div key={col} className="glass rounded-2xl p-3">
                <div className="text-mono-label mb-3 flex items-center justify-between">
                  <span>{columnLabels[col]}</span>
                  <span>{tasks.filter(t => t.status === col).length}</span>
                </div>
                <div className="space-y-2">
                  {tasks.filter(t => t.status === col).length === 0 && (
                    <div className="rounded-xl border border-dashed border-hairline p-3 text-center text-xs text-muted-foreground">Nothing here.</div>
                  )}
                  {tasks.filter(t => t.status === col).map(t => (
                    <div key={t.id} className="rounded-xl border border-hairline bg-surface p-3">
                      <div className="text-sm">{t.title}</div>
                      <div className="text-mono-label mt-1">{t.event.title}</div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{t.assignee.name}</span>
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
