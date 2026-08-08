import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/backend/db/prisma";
import { assignTask, updateTaskStatus } from "@/backend/domain/tasks";
import { TASK_STATUSES } from "@/backend/domain/workflow-rules";
import { formatTaskDue } from "@/lib/format";
import type { AssistantTool, ToolActor } from "@/backend/assistant/tools/types";

function taskBoardHref(actor: ToolActor): string {
  if (actor.isFaculty) return "/faculty";
  if (actor.memberships.some((m) => m.role === "Coordinator")) {
    return "/coordinator/volunteers";
  }
  return "/volunteer";
}

function revalidateTaskSurfaces() {
  revalidatePath("/volunteer");
  revalidatePath("/coordinator");
  revalidatePath("/coordinator/volunteers");
  revalidatePath("/app");
}

/** Task board actions in Ask Sangam — Volunteer + Coordinator shells only (Admin has no task UI). */
const TASK_CAPABLE_ROLES = new Set(["Volunteer", "Coordinator"]);

function canWorkTasks(actor: ToolActor): boolean {
  return actor.memberships.some((m) => TASK_CAPABLE_ROLES.has(m.role));
}

function canAssignTasks(actor: ToolActor): boolean {
  return actor.memberships.some((m) => m.role === "Coordinator");
}

function managedClubIds(actor: ToolActor): string[] {
  return actor.memberships.filter((m) => m.role === "Coordinator").map((m) => m.clubId);
}

const listMyTasksSchema = z.object({});

export const list_my_tasks: AssistantTool<z.infer<typeof listMyTasksSchema>> = {
  name: "list_my_tasks",
  description:
    "List open tasks the user can act on. Volunteers see their own assigned open tasks. Coordinators see open tasks on events in clubs they manage (so they can resolve 'the first task' / a title on the board). Use before update_task_status.",
  risk: "read",
  requiresConfirmation: false,
  isAvailable: canWorkTasks,
  inputSchema: listMyTasksSchema,
  anthropicInputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  previewArgs: () => ({}),
  summarize: (_args, result) => {
    const count = Array.isArray((result as { tasks?: unknown[] } | undefined)?.tasks)
      ? (result as { tasks: unknown[] }).tasks.length
      : 0;
    return count === 0 ? "No open tasks found." : `Found ${count} open task${count === 1 ? "" : "s"}.`;
  },
  async execute(actor) {
    const clubIds = managedClubIds(actor);
    const tasks =
      clubIds.length > 0
        ? await prisma.task.findMany({
            where: {
              status: { not: "done" },
              event: { clubId: { in: clubIds } },
            },
            include: {
              event: { select: { id: true, title: true } },
              assignee: { select: { id: true, name: true } },
            },
            orderBy: [{ title: "asc" }],
            take: 30,
          })
        : await prisma.task.findMany({
            where: { assigneeId: actor.id, status: { not: "done" } },
            include: {
              event: { select: { id: true, title: true } },
              assignee: { select: { id: true, name: true } },
            },
            orderBy: [{ dueAt: "asc" }],
            take: 20,
          });

    const data = {
      tasks: tasks.map((t, index) => ({
        index: index + 1,
        id: t.id,
        title: t.title,
        status: t.status,
        role: t.role,
        priority: t.priority,
        dueAt: formatTaskDue(t.dueAt),
        eventId: t.event.id,
        eventTitle: t.event.title,
        assigneeId: t.assigneeId,
        assigneeName: t.assignee?.name ?? null,
      })),
    };

    const summary =
      data.tasks.length === 0
        ? "No open tasks found."
        : `Found ${data.tasks.length} open task${data.tasks.length === 1 ? "" : "s"}.`;

    return {
      data,
      summary,
      sourceLabel: tasks[0]?.title,
      sourceHref: taskBoardHref(actor),
    };
  },
};

const updateTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(TASK_STATUSES),
});

export const update_task_status: AssistantTool<z.infer<typeof updateTaskStatusSchema>> = {
  name: "update_task_status",
  description:
    "Update the status of ONE clearly identified task. Status must be todo, doing, or done. Resolve taskId via list_my_tasks first. If several tasks match (same person / same title), do NOT guess and do NOT ask in chat — call offer_task_status_choices instead.",
  risk: "write",
  requiresConfirmation: true,
  isAvailable: canWorkTasks,
  inputSchema: updateTaskStatusSchema,
  anthropicInputSchema: {
    type: "object",
    properties: {
      taskId: { type: "string", description: "The task id from list_my_tasks." },
      status: { type: "string", enum: [...TASK_STATUSES], description: "New status: todo, doing, or done." },
    },
    required: ["taskId", "status"],
  },
  previewArgs: (args) => ({
    taskId: args.taskId,
    status: args.status,
  }),
  summarize: (args) => `Set task ${args.taskId} status to ${args.status}.`,
  async execute(actor, args) {
    const updated = await updateTaskStatus(
      { id: actor.id, memberships: actor.memberships },
      args.taskId,
      args.status,
    );
    revalidateTaskSurfaces();
    return {
      data: { id: updated.id, title: updated.title, status: updated.status },
      summary: `Updated “${updated.title}” to ${updated.status}.`,
      sourceLabel: updated.title,
      sourceHref: taskBoardHref(actor),
    };
  },
};

const offerTaskStatusChoicesSchema = z.object({
  status: z.enum(TASK_STATUSES),
  options: z
    .array(
      z.object({
        taskId: z.string().min(1),
        title: z.string().min(1),
        eventTitle: z.string().optional(),
        assigneeName: z.string().optional(),
      }),
    )
    .min(2)
    .max(20),
});

/**
 * UI-only write proposal: presents selectable task options. Never mutates DB;
 * Accept runs update_task_status for the chosen option's signed token.
 */
export const offer_task_status_choices: AssistantTool<z.infer<typeof offerTaskStatusChoicesSchema>> = {
  name: "offer_task_status_choices",
  description:
    "When 2+ tasks match a status-change request (e.g. same assignee has Booth setup and Poster design), call this instead of asking which one in chat. The UI will let the user pick, then Accept applies update_task_status.",
  risk: "write",
  requiresConfirmation: true,
  isAvailable: canWorkTasks,
  inputSchema: offerTaskStatusChoicesSchema,
  anthropicInputSchema: {
    type: "object",
    properties: {
      status: { type: "string", enum: [...TASK_STATUSES] },
      options: {
        type: "array",
        items: {
          type: "object",
          properties: {
            taskId: { type: "string" },
            title: { type: "string" },
            eventTitle: { type: "string" },
            assigneeName: { type: "string" },
          },
          required: ["taskId", "title"],
        },
      },
    },
    required: ["status", "options"],
  },
  previewArgs: (args) => ({
    status: args.status,
    options: args.options.map((o, i) => `${i + 1}. ${o.title}`).join("\n"),
  }),
  summarize: (args) => `Choose which task to mark as ${args.status}`,
  async execute() {
    throw new Error("Select a task in the UI, then Accept — this tool does not run directly.");
  },
};

const assignTaskSchema = z.object({
  title: z.string().min(1),
  role: z.string().min(1),
  eventId: z.string().min(1),
  assigneeId: z.string().min(1),
  assigneeName: z.string().optional(),
  eventTitle: z.string().optional(),
});

export const assign_task: AssistantTool<z.infer<typeof assignTaskSchema>> = {
  name: "assign_task",
  description:
    "Create and assign a single new task to a club member for an event. Coordinators only. Resolve eventId and assigneeId via list_club_events / resolve_members_by_name (or known ids) first. For many different tasks to different people, use propose_bulk_task_assignments instead.",
  risk: "write",
  requiresConfirmation: true,
  isAvailable: canAssignTasks,
  inputSchema: assignTaskSchema,
  anthropicInputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Task title." },
      role: { type: "string", description: "Volunteer role label for the task." },
      eventId: { type: "string", description: "Event id the task belongs to." },
      assigneeId: { type: "string", description: "User id of the assignee (must be a club member)." },
      assigneeName: { type: "string" },
      eventTitle: { type: "string" },
    },
    required: ["title", "role", "eventId", "assigneeId"],
  },
  previewArgs: (args) => ({
    title: args.title,
    role: args.role,
    event: args.eventTitle ?? args.eventId,
    assignee: args.assigneeName ?? args.assigneeId,
  }),
  summarize: (args) =>
    `Assign “${args.title}” (${args.role}) to ${args.assigneeName ?? args.assigneeId}.`,
  async execute(actor, args) {
    const created = await assignTask(
      { id: actor.id, memberships: actor.memberships },
      {
        title: args.title,
        role: args.role,
        eventId: args.eventId,
        assigneeId: args.assigneeId,
      },
    );
    revalidateTaskSurfaces();
    return {
      data: { id: created.id, title: created.title, status: created.status, assigneeId: created.assigneeId },
      summary: `Assigned “${created.title}” successfully.`,
      sourceLabel: created.title,
      sourceHref: taskBoardHref(actor),
    };
  },
};

export const TASK_TOOLS = [list_my_tasks, update_task_status, offer_task_status_choices, assign_task] as const;

/** Enrich update_task_status summary with the task title when available (proposal time). */
export async function enrichUpdateTaskSummary(
  args: z.infer<typeof updateTaskStatusSchema>,
): Promise<string> {
  const task = await prisma.task.findUnique({ where: { id: args.taskId }, select: { title: true } });
  if (!task) return update_task_status.summarize(args);
  return `Mark task “${task.title}” as ${args.status}.`;
}
