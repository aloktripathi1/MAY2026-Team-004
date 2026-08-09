import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/backend/db/prisma";
import { assignTasksBulk, BULK_ASSIGN_MAX_ROWS } from "@/backend/domain/tasks";
import { SURFACE_ROLES } from "@/backend/auth/roles";
import type { AssistantTool, ToolActor } from "@/backend/assistant/tools/types";

/** Mirrors canManageClub (domain/tasks.ts) — Admin outranks Coordinator here too. */
const COORDINATOR_SURFACE_ROLES = new Set(SURFACE_ROLES.Coordinator ?? ["Coordinator"]);

function coordinatorClubIds(actor: ToolActor): string[] {
  return actor.memberships.filter((m) => COORDINATOR_SURFACE_ROLES.has(m.role)).map((m) => m.clubId);
}

function canResolveAssignContext(actor: ToolActor): boolean {
  return coordinatorClubIds(actor).length > 0;
}

function canUseBulkAssign(actor: ToolActor): boolean {
  return coordinatorClubIds(actor).length > 0;
}

const listClubEventsSchema = z.object({
  query: z.string().optional(),
});

const listClubVolunteersSchema = z.object({
  eventId: z.string().min(1),
});

const resolveMembersSchema = z.object({
  eventId: z.string().min(1),
  names: z.array(z.string().min(1)).min(1).max(BULK_ASSIGN_MAX_ROWS),
});

const bulkAssignRowSchema = z.object({
  title: z.string().min(1),
  role: z.string().min(1),
  eventId: z.string().min(1),
  assigneeId: z.string().min(1),
  assigneeName: z.string().optional(),
  eventTitle: z.string().optional(),
});

const bulkAssignSchema = z.object({
  assignments: z.array(bulkAssignRowSchema).min(1).max(BULK_ASSIGN_MAX_ROWS),
});

export const list_club_events: AssistantTool<z.infer<typeof listClubEventsSchema>> = {
  name: "list_club_events",
  description:
    "List upcoming events for clubs where the user is a Coordinator or Admin. Use to resolve event names to eventId before assigning tasks.",
  risk: "read",
  requiresConfirmation: false,
  isAvailable: canResolveAssignContext,
  inputSchema: listClubEventsSchema,
  anthropicInputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Optional title substring filter" },
    },
    required: [],
  },
  previewArgs: () => ({}),
  summarize: () => "Listed club events",
  async execute(actor, args) {
    const clubIds = coordinatorClubIds(actor);
    const events = await prisma.event.findMany({
      where: {
        clubId: { in: clubIds },
        ...(args.query
          ? { title: { contains: args.query, mode: "insensitive" as const } }
          : { date: { gte: new Date() } }),
      },
      include: { club: true },
      orderBy: { date: "asc" },
      take: 20,
    });
    return {
      data: events.map((e) => ({
        id: e.id,
        title: e.title,
        clubId: e.clubId,
        clubName: e.club.name,
        date: e.date.toISOString(),
      })),
      summary: `Found ${events.length} event(s)`,
    };
  },
};

export const list_club_volunteers: AssistantTool<z.infer<typeof listClubVolunteersSchema>> = {
  name: "list_club_volunteers",
  description:
    "List Active members with role Volunteer on the club that owns the given event. Use for 'all volunteers' expansion.",
  risk: "read",
  requiresConfirmation: false,
  isAvailable: canResolveAssignContext,
  inputSchema: listClubVolunteersSchema,
  anthropicInputSchema: {
    type: "object",
    properties: {
      eventId: { type: "string", description: "Event id whose club provides the volunteer pool" },
    },
    required: ["eventId"],
  },
  previewArgs: (args) => ({ eventId: args.eventId }),
  summarize: () => "Listed club volunteers",
  async execute(actor, args) {
    const clubIds = coordinatorClubIds(actor);
    const event = await prisma.event.findUnique({ where: { id: args.eventId } });
    if (!event || !clubIds.includes(event.clubId)) {
      throw new Error("Event not found in your coordinator clubs");
    }
    const memberships = await prisma.membership.findMany({
      where: { clubId: event.clubId, status: "Active", role: "Volunteer" },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
      take: 100,
    });
    return {
      data: memberships.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
      })),
      summary: `Found ${memberships.length} volunteer(s)`,
    };
  },
};

export const resolve_members_by_name: AssistantTool<z.infer<typeof resolveMembersSchema>> = {
  name: "resolve_members_by_name",
  description:
    "Resolve member names to user ids within the event's club. Returns matches and flags ambiguous or missing names. Do not propose bulk assign until every name is unique.",
  risk: "read",
  requiresConfirmation: false,
  isAvailable: canResolveAssignContext,
  inputSchema: resolveMembersSchema,
  anthropicInputSchema: {
    type: "object",
    properties: {
      eventId: { type: "string" },
      names: { type: "array", items: { type: "string" } },
    },
    required: ["eventId", "names"],
  },
  previewArgs: (args) => ({ eventId: args.eventId, names: args.names.join(", ") }),
  summarize: () => "Resolved member names",
  async execute(actor, args) {
    const clubIds = coordinatorClubIds(actor);
    const event = await prisma.event.findUnique({ where: { id: args.eventId } });
    if (!event || !clubIds.includes(event.clubId)) {
      throw new Error("Event not found in your coordinator clubs");
    }

    const memberships = await prisma.membership.findMany({
      where: { clubId: event.clubId, status: "Active" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const results = args.names.map((name) => {
      const needle = name.trim().toLowerCase();
      const matches = memberships.filter((m) => {
        const full = m.user.name.toLowerCase();
        const first = full.split(/\s+/)[0] ?? full;
        return full === needle || first === needle || full.includes(needle);
      });
      if (matches.length === 0) {
        return { name, status: "missing" as const, matches: [] };
      }
      if (matches.length > 1) {
        return {
          name,
          status: "ambiguous" as const,
          matches: matches.map((m) => ({
            userId: m.user.id,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
          })),
        };
      }
      return {
        name,
        status: "ok" as const,
        matches: [
          {
            userId: matches[0].user.id,
            name: matches[0].user.name,
            email: matches[0].user.email,
            role: matches[0].role,
          },
        ],
      };
    });

    return {
      data: { results },
      summary: "Name resolution complete",
    };
  },
};

export const propose_bulk_task_assignments: AssistantTool<z.infer<typeof bulkAssignSchema>> = {
  name: "propose_bulk_task_assignments",
  description:
    "Propose creating many different tasks for different people in one shot. Only call after every assigneeId and eventId are resolved. Max 50 rows. User must Accept in the UI before anything is saved.",
  risk: "write",
  requiresConfirmation: true,
  isAvailable: canUseBulkAssign,
  inputSchema: bulkAssignSchema,
  anthropicInputSchema: {
    type: "object",
    properties: {
      assignments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            role: { type: "string" },
            eventId: { type: "string" },
            assigneeId: { type: "string" },
            assigneeName: { type: "string" },
            eventTitle: { type: "string" },
          },
          required: ["title", "role", "eventId", "assigneeId"],
        },
      },
    },
    required: ["assignments"],
  },
  previewArgs: (args) => {
    const lines = args.assignments.map((a, i) => {
      const who = a.assigneeName ?? a.assigneeId;
      const event = a.eventTitle ?? a.eventId;
      return `${i + 1}. ${a.title} → ${who} (${event})`;
    });
    return {
      count: String(args.assignments.length),
      assignments: lines.join("\n"),
    };
  },
  summarize: (args) =>
    `Assign ${args.assignments.length} task${args.assignments.length === 1 ? "" : "s"} across the selected people`,
  async execute(actor, args) {
    const tasks = await assignTasksBulk(
      { id: actor.id, memberships: actor.memberships },
      args.assignments.map((a) => ({
        title: a.title,
        role: a.role,
        eventId: a.eventId,
        assigneeId: a.assigneeId,
      })),
    );

    revalidatePath("/coordinator/volunteers");
    revalidatePath("/coordinator");
    revalidatePath("/volunteer");
    revalidatePath("/app");

    return {
      data: { createdIds: tasks.map((t) => t.id), count: tasks.length },
      summary: `Created ${tasks.length} task${tasks.length === 1 ? "" : "s"}`,
      sourceLabel: `${tasks.length} tasks`,
      sourceHref: "/coordinator/volunteers",
    };
  },
};

export const BULK_TASK_TOOLS = [
  list_club_events,
  list_club_volunteers,
  resolve_members_by_name,
  propose_bulk_task_assignments,
] as const;
