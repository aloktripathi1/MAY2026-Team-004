import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAnnouncement } from "@/backend/domain/announcements";
import { prisma } from "@/backend/db/prisma";
import type { AssistantTool, ToolActor } from "@/backend/assistant/tools/types";

function adminMemberships(actor: ToolActor) {
  return actor.memberships.filter((m) => m.role === "Admin");
}

function canDraftAnnouncement(actor: ToolActor): boolean {
  return adminMemberships(actor).length > 0;
}

function adminClubIds(actor: ToolActor): string[] {
  return adminMemberships(actor).map((m) => m.clubId);
}

const resolveClubMembersSchema = z.object({
  names: z.array(z.string().min(1)).min(1).max(20),
  clubId: z.string().optional(),
});

/**
 * Resolve club member names for targeted announcements (admin shell).
 * Returns unique / ambiguous / missing so the agent does not guess.
 */
export const resolve_club_members_by_name: AssistantTool<z.infer<typeof resolveClubMembersSchema>> = {
  name: "resolve_club_members_by_name",
  description:
    "Resolve member names to user ids in a club you admin. Use before propose_announcement when the user names specific people (e.g. 'for Purnendu'). Returns exact matches, ambiguous candidates, and missing names. Do not propose until every name is unique.",
  risk: "read",
  requiresConfirmation: false,
  isAvailable: canDraftAnnouncement,
  inputSchema: resolveClubMembersSchema,
  anthropicInputSchema: {
    type: "object",
    properties: {
      names: { type: "array", items: { type: "string" } },
      clubId: { type: "string", description: "Optional; defaults to the admin's primary club" },
    },
    required: ["names"],
  },
  previewArgs: (args) => ({ names: args.names.join(", ") }),
  summarize: () => "Resolved club member names",
  async execute(actor, args) {
    const clubIds = adminClubIds(actor);
    const clubId = args.clubId && clubIds.includes(args.clubId) ? args.clubId : clubIds[0];
    if (!clubId) throw new Error("No admin club membership available");

    const memberships = await prisma.membership.findMany({
      where: { clubId, status: "Active" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const resolved: Array<{ query: string; userId: string; name: string; email: string }> = [];
    const ambiguous: Array<{ query: string; candidates: Array<{ userId: string; name: string }> }> = [];
    const missing: string[] = [];

    for (const raw of args.names) {
      const query = raw.trim();
      const q = query.toLowerCase();
      const matches = memberships.filter((m) => {
        const name = m.user.name.toLowerCase();
        return name === q || name.includes(q) || q.includes(name);
      });
      if (matches.length === 1) {
        const m = matches[0]!;
        resolved.push({
          query,
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
        });
      } else if (matches.length > 1) {
        ambiguous.push({
          query,
          candidates: matches.map((m) => ({ userId: m.user.id, name: m.user.name })),
        });
      } else {
        missing.push(query);
      }
    }

    return {
      data: { clubId, resolved, ambiguous, missing },
      summary: `Resolved ${resolved.length} name(s)`,
    };
  },
};

const proposeAnnouncementSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.enum(["All", "Coordinators", "Volunteers"]).default("All"),
  priority: z.enum(["Low", "Med", "High"]).default("Med"),
  pinned: z.boolean().optional(),
  clubId: z.string().optional(),
  /** Target specific Active club members (from resolve_club_members_by_name). */
  recipientUserIds: z.array(z.string().min(1)).max(50).optional(),
  /** Display names aligned with recipientUserIds for the proposal preview. */
  recipientNames: z.array(z.string().min(1)).max(50).optional(),
});

export const propose_announcement: AssistantTool<z.infer<typeof proposeAnnouncementSchema>> = {
  name: "propose_announcement",
  description:
    "Propose posting a club announcement (title, body). For role audiences use audience All|Coordinators|Volunteers (UI can still change it). For specific people: resolve_club_members_by_name first, then pass recipientUserIds + recipientNames — UI then only picks timing. Priority is overridden by the timing picker.",
  risk: "write",
  requiresConfirmation: true,
  isAvailable: canDraftAnnouncement,
  inputSchema: proposeAnnouncementSchema as z.ZodType<z.infer<typeof proposeAnnouncementSchema>>,
  anthropicInputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      body: { type: "string" },
      audience: { type: "string", enum: ["All", "Coordinators", "Volunteers"] },
      priority: { type: "string", enum: ["Low", "Med", "High"] },
      pinned: { type: "boolean" },
      clubId: { type: "string", description: "Optional; defaults to the admin's primary club" },
      recipientUserIds: {
        type: "array",
        items: { type: "string" },
        description: "Specific recipients; use resolve_club_members_by_name first",
      },
      recipientNames: {
        type: "array",
        items: { type: "string" },
        description: "Display names matching recipientUserIds",
      },
    },
    required: ["title", "body"],
  },
  previewArgs: (args) => {
    const preview: Record<string, string> = {
      title: args.title,
      body: args.body.length > 160 ? `${args.body.slice(0, 157)}…` : args.body,
      priority: args.priority,
    };
    if (args.recipientUserIds && args.recipientUserIds.length > 0) {
      preview.to =
        args.recipientNames && args.recipientNames.length > 0
          ? args.recipientNames.join(", ")
          : `${args.recipientUserIds.length} member(s)`;
    } else {
      preview.audience = args.audience;
    }
    return preview;
  },
  summarize: (args) => {
    if (args.recipientUserIds && args.recipientUserIds.length > 0) {
      const who =
        args.recipientNames && args.recipientNames.length > 0
          ? args.recipientNames.join(", ")
          : `${args.recipientUserIds.length} member(s)`;
      return `Post announcement “${args.title}” to ${who} (${args.priority} priority)`;
    }
    return `Post announcement “${args.title}” to ${args.audience} (${args.priority} priority)`;
  },
  async execute(actor, args) {
    const admins = adminMemberships(actor);
    const clubId = args.clubId ?? admins[0]?.clubId;
    if (!clubId) throw new Error("No admin club membership available");

    const announcement = await createAnnouncement(
      { id: actor.id, memberships: actor.memberships },
      {
        title: args.title,
        body: args.body,
        audience: args.audience,
        priority: args.priority,
        pinned: args.pinned ?? false,
        clubId,
        ...(args.recipientUserIds && args.recipientUserIds.length > 0
          ? { recipientUserIds: args.recipientUserIds }
          : {}),
      },
    );

    revalidatePath("/admin/announcements");
    revalidatePath("/admin");
    revalidatePath("/app");

    return {
      data: { id: announcement.id },
      summary: `Posted “${announcement.title}”`,
      sourceLabel: announcement.title,
      sourceHref: "/admin/announcements",
    };
  },
};

export const ANNOUNCEMENT_TOOLS = [resolve_club_members_by_name, propose_announcement] as const;
