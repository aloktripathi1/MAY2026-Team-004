import { z } from "zod";
import type { SessionMembership } from "@/backend/auth/session-cookies";
import { prisma } from "@/backend/db/prisma";
import { notifyAnnouncement } from "@/backend/email/notifications";

const createAnnouncementSchema = z
  .object({
    title: z.string().min(1, "Headline is required"),
    body: z.string().min(1, "Body is required"),
    pinned: z.boolean().optional(),
    audience: z.enum(["All", "Coordinators", "Volunteers"]).default("All"),
    priority: z.enum(["Low", "Med", "High"]).default("Med"),
    clubId: z.string().min(1, "Club is required"),
    /** When set (non-empty), email goes to these Active club members instead of role audience. */
    recipientUserIds: z.array(z.string().min(1)).max(50).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.recipientUserIds && value.recipientUserIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "recipientUserIds must be omitted or non-empty",
        path: ["recipientUserIds"],
      });
    }
  });

export type AnnouncementActor = {
  id: string;
  memberships: SessionMembership[];
};

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

function canAdminClub(memberships: SessionMembership[], clubId: string): boolean {
  return memberships.some((m) => m.clubId === clubId && m.role === "Admin");
}

/**
 * Authoritative announcement create + notify. Used by the admin form action
 * and by Ask Sangam confirm — same emails and authz.
 */
export async function createAnnouncement(actor: AnnouncementActor, input: CreateAnnouncementInput) {
  const parsed = createAnnouncementSchema.parse(input);
  if (!canAdminClub(actor.memberships, parsed.clubId)) {
    throw new Error("You must be a club admin to post announcements.");
  }

  const recipientUserIds = [...new Set(parsed.recipientUserIds ?? [])];
  if (recipientUserIds.length > 0) {
    const memberships = await prisma.membership.findMany({
      where: {
        clubId: parsed.clubId,
        status: "Active",
        userId: { in: recipientUserIds },
      },
      select: { userId: true },
    });
    const found = new Set(memberships.map((m) => m.userId));
    const missing = recipientUserIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new Error("Every recipient must be an Active member of this club.");
    }
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: parsed.title,
      body: parsed.body,
      pinned: parsed.pinned ?? false,
      // Role audience is unused for email when recipientUserIds is set; keep All for schema defaults.
      audience: recipientUserIds.length > 0 ? "All" : parsed.audience,
      priority: parsed.priority,
      clubId: parsed.clubId,
      authorId: actor.id,
      recipientUserIds,
    },
  });

  // High priority mails the audience now; Low and Med go through the digest.
  await notifyAnnouncement(announcement.id);

  return announcement;
}
