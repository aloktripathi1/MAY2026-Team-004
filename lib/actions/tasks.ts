"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { normalizeTaskStatus, TASK_STATUSES } from "@/lib/workflow-rules";

const statusSchema = z.enum(TASK_STATUSES);

// Shared by the Volunteer "my tasks" view and the Coordinator's volunteer kanban board.
export async function updateTaskStatusAction(taskId: string, status: string) {
  const session = getMockSession();
  if (!session?.user) throw new Error("Not authenticated");

  const parsedStatus = normalizeTaskStatus(statusSchema.parse(status));
  await prisma.task.update({ where: { id: taskId }, data: { status: parsedStatus } });

  // Keep every role surface that reads task status in sync.
  revalidatePath("/volunteer");
  revalidatePath("/coordinator");
  revalidatePath("/coordinator/volunteers");
  revalidatePath("/app");
}
