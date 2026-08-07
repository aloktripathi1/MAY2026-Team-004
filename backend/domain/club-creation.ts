"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/backend/db/prisma";
import { generateUniqueSlug } from "@/lib/slug-utils";

export type ClubCreationInput = {
  name: string;
  tagline: string;
  category: string;
  hue: string;
  emoji: string;
  founded: string;
  description: string;
  banner: string;
  photo?: string;
};

export async function requestClubCreation(userId: string, userRole: string | undefined, input: ClubCreationInput) {
  // Only Members can create clubs
  if (userRole && userRole !== "Member") {
    return {
      ok: false,
      code: "FORBIDDEN" as const,
      message: "Only Members can create clubs.",
    };
  }

  const existingCreation = await prisma.clubCreationRequest.findFirst({
    where: { creatorId: userId, status: "pending" },
  });

  if (existingCreation) {
    return {
      ok: false,
      code: "PENDING_REQUEST_EXISTS" as const,
      message: "You already have a pending club creation request.",
    };
  }

  // Check if user already has an approved club
  const approvedClub = await prisma.clubCreationRequest.findFirst({
    where: { creatorId: userId, status: "approved" },
  });

  if (approvedClub) {
    return {
      ok: false,
      code: "CLUB_LIMIT_REACHED" as const,
      message: "You can only create one club.",
    };
  }

  const slug = await generateUniqueSlug(input.name, async (testSlug) => {
    const existing = await prisma.clubCreationRequest.findUnique({
      where: { slug: testSlug },
    });
    return !existing;
  });

  const request = await prisma.clubCreationRequest.create({
    data: {
      name: input.name,
      tagline: input.tagline,
      category: input.category as any,
      hue: input.hue,
      emoji: input.emoji,
      founded: input.founded,
      description: input.description,
      banner: input.banner,
      photo: input.photo,
      slug,
      creatorId: userId,
      status: "pending",
    },
  });

  revalidatePath("/admin/approvals");
  return { ok: true, request } as const;
}

export async function approveClubCreation(requestId: string) {
  const request = await prisma.clubCreationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return {
      ok: false,
      code: "NOT_FOUND" as const,
      message: "Club creation request not found.",
    };
  }

  if (request.status !== "pending") {
    return {
      ok: false,
      code: "INVALID_STATUS" as const,
      message: "This request has already been processed.",
    };
  }

  try {
    const [club, membership] = await Promise.all([
      prisma.club.create({
        data: {
          slug: request.slug,
          name: request.name,
          tagline: request.tagline,
          category: request.category,
          hue: request.hue,
          emoji: request.emoji,
          founded: request.founded,
          description: request.description,
          banner: request.banner,
          photo: request.photo,
        },
      }),
      // Will create membership after club is ready
      null,
    ]);

    // Make creator an admin of the club
    await prisma.membership.create({
      data: {
        userId: request.creatorId,
        clubId: club.id,
        role: "Admin",
        status: "Active",
      },
    });

    // Mark request as approved
    await prisma.clubCreationRequest.update({
      where: { id: requestId },
      data: { status: "approved", approvedAt: new Date() },
    });

    revalidatePath("/admin/approvals");
    revalidatePath("/admin");
    revalidatePath("/app/clubs");

    return { ok: true, club } as const;
  } catch (error: any) {
    if (error.code === "P2002") {
      return {
        ok: false,
        code: "SLUG_EXISTS" as const,
        message: "A club with this slug already exists.",
      };
    }
    throw error;
  }
}

export async function rejectClubCreation(requestId: string) {
  const request = await prisma.clubCreationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return {
      ok: false,
      code: "NOT_FOUND" as const,
      message: "Club creation request not found.",
    };
  }

  if (request.status !== "pending") {
    return {
      ok: false,
      code: "INVALID_STATUS" as const,
      message: "This request has already been processed.",
    };
  }

  await prisma.clubCreationRequest.update({
    where: { id: requestId },
    data: { status: "rejected" },
  });

  revalidatePath("/admin/approvals");
  return { ok: true } as const;
}
