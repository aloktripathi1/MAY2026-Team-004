"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/lib/mock-session";
import { getPrimaryClubMembership } from "@/lib/session-helpers";
import { prisma } from "@/lib/prisma";

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
  const session = getMockSession();
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

  await prisma.task.create({
    data: {
      title: parsed.data.title,
      role: parsed.data.role,
      eventId: parsed.data.eventId,
      assigneeId: parsed.data.assigneeId,
      status: "todo",
    },
  });

  revalidatePath("/coordinator/volunteers");
  return { ok: true };
}
