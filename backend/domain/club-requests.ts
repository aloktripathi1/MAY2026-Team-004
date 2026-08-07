import { Prisma, type ClubCategory } from "@prisma/client";
import { prisma } from "@/backend/db/prisma";
import { notifyClubRequestDecision, notifyClubRequestSubmitted } from "@/backend/email/notifications";

/**
 * Club provisioning: a student proposes a club, faculty decide, and approval
 * creates the Club together with the requester's Admin membership.
 *
 * This is the entry point to the entire role hierarchy. Before it existed, a
 * Club row and the first Admin of a club could only come from prisma/seed.ts,
 * so a freshly deployed database had no way for anyone to gain any role through
 * the app at all — clubs with no admins, and no way to appoint one.
 *
 * Authorization lives in the callers (Server Actions and routes) as elsewhere in
 * backend/domain; these functions assume the caller has already been checked,
 * except where the check depends on data only visible here.
 */

export const CLUB_CATEGORIES: ClubCategory[] = [
  "Technical",
  "Cultural",
  "Sports",
  "Entrepreneurship",
  "Literary",
  "Social",
  "Design",
];

/** How many pending proposals one student may have open at once. */
const MAX_OPEN_REQUESTS = 3;

/** Matches the gradient formula the seeded clubs use (lib/seed-data.ts). */
function clubGradient(hue: string): string {
  return `linear-gradient(135deg, oklch(0.32 0.09 ${hue}) 0%, oklch(0.15 0.04 ${hue}) 100%)`;
}

/**
 * A stable hue per club name, so a club's colour is derived rather than asked
 * for, and never changes once approved.
 */
function hueFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return String(hash);
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "club"
  );
}

/**
 * Club.slug is unique and appears in URLs, so a second "Chess Club" must not
 * collide with the first. Suffixes only when needed, keeping the common case
 * clean.
 */
async function uniqueClubSlug(name: string): Promise<string> {
  const base = slugify(name);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const taken = await prisma.club.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  // Astronomically unlikely; still better than looping forever.
  return `${base}-${Date.now().toString(36)}`;
}

export type ClubRequestInput = {
  name: string;
  tagline: string;
  category: ClubCategory;
  description: string;
  emoji?: string;
};

export async function submitClubRequest(userId: string, input: ClubRequestInput) {
  const name = input.name.trim();

  // A club that already exists doesn't need proposing, and the reviewer
  // shouldn't have to catch it.
  const existingClub = await prisma.club.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { name: true },
  });
  if (existingClub) {
    return { ok: false, code: "CLUB_EXISTS", message: `${existingClub.name} already exists on Sangam.` } as const;
  }

  const duplicate = await prisma.clubRequest.findFirst({
    where: { status: "Pending", name: { equals: name, mode: "insensitive" } },
    select: { requestedById: true },
  });
  if (duplicate) {
    return {
      ok: false,
      code: "REQUEST_EXISTS",
      message:
        duplicate.requestedById === userId
          ? "You already have a pending request for this club."
          : "Someone has already proposed this club and it's awaiting review.",
    } as const;
  }

  const openCount = await prisma.clubRequest.count({ where: { requestedById: userId, status: "Pending" } });
  if (openCount >= MAX_OPEN_REQUESTS) {
    return {
      ok: false,
      code: "TOO_MANY_OPEN",
      message: `You already have ${openCount} requests awaiting review. Wait for a decision before proposing another.`,
    } as const;
  }

  const request = await prisma.clubRequest.create({
    data: {
      name,
      tagline: input.tagline.trim(),
      category: input.category,
      description: input.description.trim(),
      ...(input.emoji?.trim() ? { emoji: input.emoji.trim() } : {}),
      requestedById: userId,
    },
  });

  // Notifications live here rather than in the Server Action so every caller
  // gets them — the same reasoning as membership.ts and events.ts. Attaching
  // them to one entry point is what left the "Count Me In" button silent while
  // the REST route mailed correctly.
  await notifyClubRequestSubmitted(request.id);

  return { ok: true, request } as const;
}

export async function listClubRequestsForUser(userId: string) {
  return prisma.clubRequest.findMany({
    where: { requestedById: userId },
    orderBy: { createdAt: "desc" },
    include: { createdClub: { select: { slug: true, name: true } } },
  });
}

export async function listClubRequests(status?: "Pending" | "Approved" | "Rejected") {
  return prisma.clubRequest.findMany({
    where: status ? { status } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      requestedBy: { select: { id: true, name: true, email: true, rollNumber: true } },
      reviewedBy: { select: { name: true } },
      createdClub: { select: { slug: true, name: true } },
    },
  });
}

/**
 * Approves a proposal: creates the Club and makes the requester its Admin.
 *
 * Both writes happen in one transaction — a Club with no Admin would be exactly
 * the dead end this feature exists to remove, and is unfixable through the UI.
 */
export async function approveClubRequest(requestId: string, reviewerId: string) {
  const request = await prisma.clubRequest.findUnique({ where: { id: requestId } });
  if (!request) return { ok: false, code: "NOT_FOUND", message: "Club request not found." } as const;
  if (request.status !== "Pending") {
    return {
      ok: false,
      code: "ALREADY_REVIEWED",
      message: `This request was already ${request.status.toLowerCase()}.`,
    } as const;
  }

  const slug = await uniqueClubSlug(request.name);
  const hue = hueFromName(request.name);

  try {
    const club = await prisma.$transaction(async (tx) => {
      const created = await tx.club.create({
        data: {
          slug,
          name: request.name,
          tagline: request.tagline,
          category: request.category,
          description: request.description,
          emoji: request.emoji,
          hue,
          banner: clubGradient(hue),
          founded: String(new Date().getFullYear()),
          active: true,
        },
      });

      await tx.membership.create({
        data: { userId: request.requestedById, clubId: created.id, role: "Admin", status: "Active" },
      });

      await tx.clubRequest.update({
        where: { id: requestId },
        data: {
          status: "Approved",
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          createdClubId: created.id,
        },
      });

      return created;
    });

    // After the transaction commits, never inside it: a slow mail provider must
    // not hold the club/membership write open.
    await notifyClubRequestDecision(requestId);

    return { ok: true, club } as const;
  } catch (error) {
    // The requester could have been added to a club of this name by another
    // route between the checks above and the write.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        ok: false,
        code: "CONFLICT",
        message: "That club or membership already exists. Refresh and check before approving again.",
      } as const;
    }
    throw error;
  }
}

export async function rejectClubRequest(requestId: string, reviewerId: string, note?: string) {
  const request = await prisma.clubRequest.findUnique({ where: { id: requestId } });
  if (!request) return { ok: false, code: "NOT_FOUND", message: "Club request not found." } as const;
  if (request.status !== "Pending") {
    return {
      ok: false,
      code: "ALREADY_REVIEWED",
      message: `This request was already ${request.status.toLowerCase()}.`,
    } as const;
  }

  const updated = await prisma.clubRequest.update({
    where: { id: requestId },
    data: {
      status: "Rejected",
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNote: note?.trim() || null,
    },
  });

  await notifyClubRequestDecision(requestId);

  return { ok: true, request: updated } as const;
}
