"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/backend/auth/mock-session";
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

// Shared by the Volunteer "my tasks" view and the Coordinator's volunteer kanban board.
export async function updateTaskStatusAction(taskId: string, status: string) {
  const session = await getMockSession();
  if (!session?.user) throw new Error("Not authenticated");
  await updateTaskStatus({ id: session.user.id, memberships: session.user.memberships }, taskId, status);

  // Keep every role surface that reads task status in sync.
  revalidatePath("/volunteer");
  revalidatePath("/coordinator");
  revalidatePath("/coordinator/volunteers");
  revalidatePath("/app");
}
