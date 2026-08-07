import { z } from "zod";
import type { SessionMembership } from "@/backend/auth/session-cookies";
import { prisma } from "@/backend/db/prisma";
import { normalizeTaskStatus, TASK_STATUSES } from "@/backend/domain/workflow-rules";
import { notifyTaskAssigned } from "@/backend/email/notifications";

const statusSchema = z.enum(TASK_STATUSES);
const assignTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  role: z.string().min(1, "Role is required"),
  eventId: z.string().min(1, "Event is required"),
  assigneeId: z.string().min(1, "Assignee is required"),
});

export type TaskActor = {
  id: string;
  memberships: SessionMembership[];
};

export type AssignTaskInput = z.infer<typeof assignTaskSchema>;

function canManageClub(memberships: SessionMembership[], clubId: string): boolean {
  return memberships.some((m) => m.clubId === clubId && (m.role === "Coordinator" || m.role === "Admin"));
}

export async function updateTaskStatus(actor: TaskActor, taskId: string, status: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { event: true } });
  if (!task) throw new Error("Task not found");

  const isOwnTask = task.assigneeId === actor.id;
  const isClubManager = canManageClub(actor.memberships, task.event.clubId);
  if (!isOwnTask && !isClubManager) throw new Error("Not authorized for this task");

  const parsedStatus = normalizeTaskStatus(statusSchema.parse(status));
  return prisma.task.update({ where: { id: taskId }, data: { status: parsedStatus } });
}

export async function assignTask(actor: TaskActor, input: AssignTaskInput) {
  const parsed = assignTaskSchema.parse(input);

  const event = await prisma.event.findUnique({ where: { id: parsed.eventId } });
  if (!event) throw new Error("Event not found");
  if (!canManageClub(actor.memberships, event.clubId)) throw new Error("Not authorized for this club");

  const assigneeMembership = await prisma.membership.findFirst({
    where: { userId: parsed.assigneeId, clubId: event.clubId },
  });
  if (!assigneeMembership) throw new Error("Assignee must belong to this club");

  const task = await prisma.task.create({
    data: {
      title: parsed.title,
      role: parsed.role,
      eventId: parsed.eventId,
      assigneeId: parsed.assigneeId,
      status: "todo",
    },
  });

  await notifyTaskAssigned(task.id);

  return task;
}

export const BULK_ASSIGN_MAX_ROWS = 50;

export type BulkAssignRow = AssignTaskInput;

export type BulkAssignValidationError = {
  index: number;
  message: string;
};

/**
 * Validate every row first, then create all in one transaction (all-or-nothing).
 * Task-assignment emails are sent after commit (best-effort).
 */
export async function assignTasksBulk(actor: TaskActor, rows: BulkAssignRow[]) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("At least one task assignment is required");
  }
  if (rows.length > BULK_ASSIGN_MAX_ROWS) {
    throw new Error(`Bulk assign is limited to ${BULK_ASSIGN_MAX_ROWS} tasks at once`);
  }

  const errors: BulkAssignValidationError[] = [];
  const prepared: Array<AssignTaskInput & { clubId: string }> = [];

  for (let index = 0; index < rows.length; index++) {
    const parsed = assignTaskSchema.safeParse(rows[index]);
    if (!parsed.success) {
      errors.push({
        index,
        message: parsed.error.issues[0]?.message ?? "Invalid assignment row",
      });
      continue;
    }

    const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
    if (!event) {
      errors.push({ index, message: "Event not found" });
      continue;
    }
    if (!canManageClub(actor.memberships, event.clubId)) {
      errors.push({ index, message: "Not authorized for this club" });
      continue;
    }

    const assigneeMembership = await prisma.membership.findFirst({
      where: { userId: parsed.data.assigneeId, clubId: event.clubId },
    });
    if (!assigneeMembership) {
      errors.push({ index, message: "Assignee must belong to this club" });
      continue;
    }

    prepared.push({ ...parsed.data, clubId: event.clubId });
  }

  if (errors.length > 0) {
    const detail = errors.map((e) => `Row ${e.index + 1}: ${e.message}`).join("; ");
    throw new Error(`Bulk assign validation failed — nothing was created. ${detail}`);
  }

  const tasks = await prisma.$transaction(
    prepared.map((row) =>
      prisma.task.create({
        data: {
          title: row.title,
          role: row.role,
          eventId: row.eventId,
          assigneeId: row.assigneeId,
          status: "todo",
        },
      }),
    ),
  );

  for (const task of tasks) {
    try {
      await notifyTaskAssigned(task.id);
    } catch (error) {
      console.error("[assignTasksBulk] notifyTaskAssigned failed", task.id, error);
    }
  }

  return tasks;
}
