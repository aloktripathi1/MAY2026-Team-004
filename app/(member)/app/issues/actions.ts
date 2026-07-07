"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const issueSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(["Registration", "Payment", "Booking", "Access", "Other"]),
  body: z.string().optional(),
});

export type IssueFormState = { error?: string; ok?: boolean };

export async function createIssueAction(_prevState: IssueFormState, formData: FormData): Promise<IssueFormState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };

  const parsed = issueSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    body: formData.get("body"),
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
    },
  });

  revalidatePath("/app/issues");
  revalidatePath("/app");
  return { ok: true };
}
