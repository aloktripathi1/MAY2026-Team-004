import { getAppSession } from "@/backend/auth/app-session";
import { requireClubAdminAccess } from "@/backend/domain/workflow-rules";
import { prisma } from "@/backend/db/prisma";
import { jsonError } from "@/backend/api/http";

/** GET /api/clubs/[id]/export — full handover data export (#103): members,
 * events, tasks, issues, and announcements for the admin's own club, as one
 * downloadable JSON bundle a successor can actually inspect. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getAppSession();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", { status: 401 });
  }

  try {
    requireClubAdminAccess(session.user.memberships, params.id);
  } catch {
    return jsonError("FORBIDDEN", "Not authorized for this club.", { status: 403 });
  }

  const club = await prisma.club.findUnique({ where: { id: params.id } });
  if (!club) {
    return jsonError("CLUB_NOT_FOUND", "Club not found.", { status: 404 });
  }

  const [memberships, events, tasks, issues, announcements] = await Promise.all([
    prisma.membership.findMany({ where: { clubId: params.id }, include: { user: true }, orderBy: { joinedAt: "asc" } }),
    prisma.event.findMany({ where: { clubId: params.id }, orderBy: { date: "desc" } }),
    prisma.task.findMany({ where: { event: { clubId: params.id } }, include: { assignee: true }, orderBy: { dueAt: "asc" } }),
    prisma.issue.findMany({ where: { clubId: params.id }, include: { raisedBy: true, assignee: true }, orderBy: { createdAt: "desc" } }),
    prisma.announcement.findMany({ where: { clubId: params.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    club: { id: club.id, slug: club.slug, name: club.name },
    members: memberships.map((m) => ({
      name: m.user.name,
      email: m.user.email,
      rollNumber: m.user.rollNumber,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
    })),
    events: events.map((e) => ({
      title: e.title,
      date: e.date,
      venue: e.venue,
      status: e.status,
      capacity: e.capacity,
      going: e.going,
      approval: e.approval,
    })),
    tasks: tasks.map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueAt: t.dueAt,
      assignee: t.assignee.name,
    })),
    issues: issues.map((i) => ({
      title: i.title,
      category: i.category,
      status: i.status,
      priority: i.priority,
      raisedBy: i.raisedBy.name,
      assignee: i.assignee?.name ?? null,
      createdAt: i.createdAt,
    })),
    announcements: announcements.map((a) => ({
      title: a.title,
      body: a.body,
      audience: a.audience,
      priority: a.priority,
      pinned: a.pinned,
      createdAt: a.createdAt,
    })),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${club.slug}-handover-export.json"`,
    },
  });
}
