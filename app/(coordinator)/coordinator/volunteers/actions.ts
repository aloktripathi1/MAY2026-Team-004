"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAppSession } from "@/backend/auth/app-session";
import { getPrimaryClubMembership } from "@/backend/auth/roles";
import { assignTask } from "@/backend/domain/tasks";

const assignTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  role: z.string().min(1, "Role is required"),
  eventId: z.string().min(1, "Event is required"),
  assigneeId: z.string().min(1, "Assignee is required"),
});

export type AssignTaskState = { error?: string; ok?: boolean };

export async function assignTaskAction(
  _prevState: AssignTaskState,
  formData: FormData
): Promise<AssignTaskState> {
  const session = await getAppSession();
  if (!session?.user) return { error: "Not authenticated" };

  const membership = getPrimaryClubMembership(session, "Coordinator");
  if (!membership) return { error: "Not a coordinator" };

  const parsed = assignTaskSchema.safeParse({
    title: formData.get("title"),
    role: formData.get("role"),
    eventId: formData.get("eventId"),
    assigneeId: formData.get("assigneeId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await assignTask(
      { id: session.user.id, memberships: session.user.memberships },
      {
        title: parsed.data.title,
        role: parsed.data.role,
        eventId: parsed.data.eventId,
        assigneeId: parsed.data.assigneeId,
      },
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not assign task." };
  }

  revalidatePath("/coordinator/volunteers");
  return { ok: true };
}
