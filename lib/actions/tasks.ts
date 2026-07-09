"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";

const statusSchema = z.enum(["todo", "doing", "done"]);

// Shared by the Volunteer "my tasks" view and the Coordinator's volunteer kanban board.
export async function updateTaskStatusAction(taskId: string, status: string) {
  const session = getMockSession();
  if (!session?.user) throw new Error("Not authenticated");

  const parsedStatus = statusSchema.parse(status);
  await prisma.task.update({ where: { id: taskId }, data: { status: parsedStatus } });

  revalidatePath("/volunteer");
  revalidatePath("/coordinator/volunteers");
}
