"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMockSession } from "@/backend/auth/mock-session";
import { requireFacultyAccess } from "@/backend/domain/workflow-rules";
import { approveClubRequest, rejectClubRequest } from "@/backend/domain/club-requests";
import { grantFaculty, revokeFaculty } from "@/backend/domain/faculty";
import { notifyFacultyAccessGranted } from "@/backend/email/notifications";

/**
 * Faculty-only actions. Faculty are institution-wide rather than club-scoped, so
 * these check `session.user.isFaculty` via requireFacultyAccess rather than any
 * per-club role — the same distinction called out on facultySetEventApprovalAction.
 */

export type ReviewState = { error?: string; ok?: boolean; message?: string };

async function requireFaculty() {
  const session = await getMockSession();
  if (!session?.user) throw new Error("Not authenticated");
  requireFacultyAccess(session.user.isFaculty);
  return session.user;
}

function revalidateProvisioning() {
  revalidatePath("/faculty/club-requests");
  revalidatePath("/faculty");
  revalidatePath("/app/clubs");
  revalidatePath("/clubs");
}

export async function approveClubRequestAction(requestId: string): Promise<ReviewState> {
  let reviewer;
  try {
    reviewer = await requireFaculty();
  } catch {
    return { error: "Faculty access is required to review club proposals." };
  }

  // approveClubRequest emails the proposer itself, so every caller notifies.
  const result = await approveClubRequest(requestId, reviewer.id);
  if (!result.ok) return { error: result.message };

  revalidateProvisioning();
  return { ok: true, message: `${result.club.name} is live, and the proposer is now its admin.` };
}

const rejectSchema = z.object({
  note: z.string().trim().max(500, "Keep the note under 500 characters.").optional(),
});

export async function rejectClubRequestAction(requestId: string, note?: string): Promise<ReviewState> {
  let reviewer;
  try {
    reviewer = await requireFaculty();
  } catch {
    return { error: "Faculty access is required to review club proposals." };
  }

  const parsed = rejectSchema.safeParse({ note });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const result = await rejectClubRequest(requestId, reviewer.id, parsed.data.note);
  if (!result.ok) return { error: result.message };

  revalidateProvisioning();
  return { ok: true, message: "Proposal declined, and the proposer has been told." };
}

const grantSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export async function grantFacultyAction(_prevState: ReviewState, formData: FormData): Promise<ReviewState> {
  let actor;
  try {
    actor = await requireFaculty();
  } catch {
    return { error: "Faculty access is required to appoint faculty." };
  }

  const parsed = grantSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const result = await grantFaculty(parsed.data.email);
  if (!result.ok) return { error: result.message };

  if (!result.changed) {
    return { ok: true, message: `${result.user.email} already had faculty access.` };
  }

  await notifyFacultyAccessGranted(result.user.id, actor.name);
  revalidatePath("/faculty/club-requests");
  revalidatePath("/faculty");
  return { ok: true, message: `${result.user.name} now has faculty access.` };
}

export async function revokeFacultyAction(userId: string): Promise<ReviewState> {
  let actor;
  try {
    actor = await requireFaculty();
  } catch {
    return { error: "Faculty access is required to remove faculty." };
  }

  const result = await revokeFaculty(userId, actor.id);
  if (!result.ok) return { error: result.message };

  revalidatePath("/faculty/club-requests");
  revalidatePath("/faculty");
  return { ok: true, message: result.changed ? `Removed faculty access from ${result.user.name}.` : "No change." };
}
