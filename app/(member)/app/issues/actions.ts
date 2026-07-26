"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getMockSession } from "@/backend/auth/mock-session";
import { prisma } from "@/backend/db/prisma";

const issueSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(["Registration", "Payment", "Booking", "Access", "Other"]),
  body: z.string().optional(),
  attachments: z.array(z.string()).max(4, "Attach up to 4 images").optional(),
});

export type IssueFormState = { error?: string; ok?: boolean };

export async function createIssueAction(_prevState: IssueFormState, formData: FormData): Promise<IssueFormState> {
  const session = getMockSession();
  if (!session?.user) return { error: "Not authenticated" };

  let attachments: string[] = [];
  const attachmentsRaw = formData.get("attachments");
  if (typeof attachmentsRaw === "string" && attachmentsRaw) {
    try {
      attachments = JSON.parse(attachmentsRaw);
    } catch {
      return { error: "Invalid attachments" };
    }
  }

  const parsed = issueSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    body: formData.get("body"),
    attachments,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.issue.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      raisedById: session.user.id,
      priority: "Low",
      attachments: parsed.data.attachments ?? [],
    },
  });

  revalidatePath("/app/issues");
  revalidatePath("/app");
  return { ok: true };
}
