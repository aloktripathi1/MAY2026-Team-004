import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/backend/db/prisma";
import { assignTask, updateTaskStatus } from "@/backend/domain/tasks";
import { TASK_STATUSES } from "@/backend/domain/workflow-rules";
import { formatTaskDue } from "@/lib/format";
import type { AssistantTool, ToolActor } from "@/backend/assistant/tools/types";

function taskBoardHref(actor: ToolActor): string {
  if (actor.isFaculty) return "/faculty";
  if (actor.memberships.some((m) => m.role === "Coordinator" || m.role === "Admin")) {
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

// Plain Members never work the task board — task tools are for people who
// actually own or manage task execution.
const TASK_CAPABLE_ROLES = new Set(["Volunteer", "Coordinator", "Admin"]);

function canWorkTasks(actor: ToolActor): boolean {
  return actor.memberships.some((m) => TASK_CAPABLE_ROLES.has(m.role));
}

function canAssignTasks(actor: ToolActor): boolean {
  return actor.memberships.some((m) => m.role === "Coordinator" || m.role === "Admin");
}

const listMyTasksSchema = z.object({});

export const listMyTasksTool: AssistantTool<z.infer<typeof listMyTasksSchema>> = {
  name: "list_my_tasks",
  description:
    "List the authenticated user's open assigned tasks (not done). Use this to resolve which task the user means before proposing a status update.",
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
    const tasks = await prisma.task.findMany({
      where: { assigneeId: actor.id, status: { not: "done" } },
      include: { event: { select: { id: true, title: true } } },
      orderBy: [{ dueAt: "asc" }],
      take: 20,
    });

    const data = {
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        role: t.role,
        priority: t.priority,
        dueAt: formatTaskDue(t.dueAt),
        eventId: t.event.id,
        eventTitle: t.event.title,
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

export const updateTaskStatusTool: AssistantTool<z.infer<typeof updateTaskStatusSchema>> = {
  name: "update_task_status",
  description:
    "Update the status of a task the user can manage (their own assignment, or any task in a club they coordinate). Status must be todo, doing, or done. Always resolve the taskId via list_my_tasks first when the user names a task by title.",
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
    const updated = await updateTaskStatus({ id: actor.id, memberships: actor.memberships }, args.taskId, args.status);
    revalidateTaskSurfaces();
    return {
      data: { id: updated.id, title: updated.title, status: updated.status },
      summary: `Updated “${updated.title}” to ${updated.status}.`,
      sourceLabel: updated.title,
      sourceHref: taskBoardHref(actor),
    };
  },
};

const assignTaskSchema = z.object({
  title: z.string().min(1),
  role: z.string().min(1),
  eventId: z.string().min(1),
  assigneeId: z.string().min(1),
});

export const assignTaskTool: AssistantTool<z.infer<typeof assignTaskSchema>> = {
  name: "assign_task",
  description:
    "Create and assign a new task to a club member for an event. Only available to Coordinators and Admins. Requires title, role label, eventId, and assigneeId.",
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
    },
    required: ["title", "role", "eventId", "assigneeId"],
  },
  previewArgs: (args) => ({
    title: args.title,
    role: args.role,
    eventId: args.eventId,
    assigneeId: args.assigneeId,
  }),
  summarize: (args) => `Assign “${args.title}” (${args.role}) to ${args.assigneeId}.`,
  async execute(actor, args) {
    const created = await assignTask({ id: actor.id, memberships: actor.memberships }, args);
    revalidateTaskSurfaces();
    return {
      data: { id: created.id, title: created.title, status: created.status, assigneeId: created.assigneeId },
      summary: `Assigned “${created.title}” successfully.`,
      sourceLabel: created.title,
      sourceHref: taskBoardHref(actor),
    };
  },
};

export const TASK_TOOLS = [listMyTasksTool, updateTaskStatusTool, assignTaskTool] as const;

/** Enrich update_task_status summary with the task title when available (proposal time). */
export async function enrichUpdateTaskSummary(args: z.infer<typeof updateTaskStatusSchema>): Promise<string> {
  const task = await prisma.task.findUnique({ where: { id: args.taskId }, select: { title: true } });
  if (!task) return updateTaskStatusTool.summarize(args);
  return `Mark task “${task.title}” as ${args.status}.`;
}
