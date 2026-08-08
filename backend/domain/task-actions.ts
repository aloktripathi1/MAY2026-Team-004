"use server";

import { revalidatePath } from "next/cache";
import { getAppSession } from "@/backend/auth/app-session";
import { updateTaskStatus } from "@/backend/domain/tasks";

/** Shared by Volunteer "my tasks" and Coordinator volunteer kanban. */
export async function updateTaskStatusAction(taskId: string, status: string) {
  const session = await getAppSession();
  if (!session?.user) throw new Error("Not authenticated");
  await updateTaskStatus({ id: session.user.id, memberships: session.user.memberships }, taskId, status);

  revalidatePath("/volunteer");
  revalidatePath("/coordinator");
  revalidatePath("/coordinator/volunteers");
  revalidatePath("/app");
}
