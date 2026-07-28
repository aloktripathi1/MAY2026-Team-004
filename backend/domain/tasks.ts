"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/backend/auth/mock-session";
import { prisma } from "@/backend/db/prisma";
import { normalizeTaskStatus, TASK_STATUSES } from "@/backend/domain/workflow-rules";

const statusSchema = z.enum(TASK_STATUSES);

// Shared by the Volunteer "my tasks" view and the Coordinator's volunteer kanban board.
export async function updateTaskStatusAction(taskId: string, status: string) {
  const session = await getMockSession();
  if (!session?.user) throw new Error("Not authenticated");

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { event: true } });
  if (!task) throw new Error("Task not found");

  // Only the assignee, or a Coordinator/Admin of the task's own club, may
  // change its status — previously any authenticated session could update
  // any task by id regardless of ownership or club (see issue #46).
  const isOwnTask = task.assigneeId === session.user.id;
  const isClubManager = session.user.memberships.some(
    (m) => m.clubId === task.event.clubId && (m.role === "Coordinator" || m.role === "Admin"),
  );
  if (!isOwnTask && !isClubManager) throw new Error("Not authorized for this task");

  const parsedStatus = normalizeTaskStatus(statusSchema.parse(status));
  await prisma.task.update({ where: { id: taskId }, data: { status: parsedStatus } });

  // Keep every role surface that reads task status in sync.
  revalidatePath("/volunteer");
  revalidatePath("/coordinator");
  revalidatePath("/coordinator/volunteers");
  revalidatePath("/app");
}
