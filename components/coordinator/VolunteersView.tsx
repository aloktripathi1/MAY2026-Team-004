import { prisma } from "@/backend/db/prisma";
import { GlassCard } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { AssignTaskModal } from "@/components/coordinator/AssignTaskModal";
import { VolunteerTaskBoard } from "@/components/coordinator/VolunteerTaskBoard";

/**
 * The Coordinator surface's volunteer roster + task board — extracted so
 * both the Coordinator's own page and the Admin's native /admin/volunteers
 * page mount the identical component instead of two copies drifting apart.
 */
export async function VolunteersView({ clubId }: { clubId: string }) {
  const [team, events] = await Promise.all([
    prisma.membership.findMany({
      where: { clubId, role: "Volunteer" },
      include: { user: true },
      take: 6,
    }),
    prisma.event.findMany({ where: { clubId }, select: { id: true, title: true }, orderBy: { date: "asc" } }),
  ]);

  const eventIds = events.map((e) => e.id);
  const tasks = await prisma.task.findMany({
    where: { eventId: { in: eventIds } },
    include: { event: true, assignee: true },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      {/* Team column */}
      <div>
        <div className="text-mono-label mb-3">Team</div>
        <div className="space-y-2">
          {team.length === 0 && <div className="text-sm text-muted-foreground">No volunteers yet.</div>}
          {team.map((m) => (
            <GlassCard key={m.id} hover={false} className="flex items-center gap-3 p-3">
              <Avatar name={m.user.name} image={m.user.image} size="sm" />
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
        <VolunteerTaskBoard initialTasks={tasks} events={events} team={team} />
      </div>
    </div>
  );
}
