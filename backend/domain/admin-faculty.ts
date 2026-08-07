"use server";

import bcrypt from "bcrypt";
import { prisma } from "@/backend/db/prisma";

export type CreateFacultyResult =
  | { ok: true; faculty: { id: string; email: string; name: string } }
  | { ok: false; code: string; message: string };

/**
 * Creates a faculty account. Requires super-admin authorization.
 * In production, this would be behind strict permission checks.
 */
export async function createFacultyAccount(
  adminId: string,
  data: { email: string; name: string; password: string },
): Promise<CreateFacultyResult> {
  // Verify admin is actually faculty (super-admin)
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isFaculty) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only faculty administrators can create faculty accounts.",
    };
  }

  // Validate email is institutional
  if (!data.email.endsWith("@ds.study.iitm.ac.in")) {
    return {
      ok: false,
      code: "INVALID_EMAIL",
      message: "Faculty email must be institutional (@ds.study.iitm.ac.in)",
    };
  }

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return {
      ok: false,
      code: "EMAIL_EXISTS",
      message: "An account with this email already exists.",
    };
  }

  // Create faculty account
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const faculty = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      hashedPassword,
      isFaculty: true,
      role: "Admin",
      interests: "[]",
    },
  });

  return {
    ok: true,
    faculty: { id: faculty.id, email: faculty.email, name: faculty.name },
  };
}

/**
 * Lists all faculty accounts.
 */
export async function listFaculty(adminId: string) {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isFaculty) {
    return { ok: false, code: "FORBIDDEN", faculty: [] };
  }

  const faculty = await prisma.user.findMany({
    where: { isFaculty: true },
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return { ok: true, faculty };
}

/**
 * Promotes a regular user to faculty.
 */
export async function promoteToFaculty(adminId: string, userId: string): Promise<CreateFacultyResult> {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isFaculty) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only faculty can promote users.",
    };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "User not found.",
    };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isFaculty: true, role: "Admin" },
  });

  return {
    ok: true,
    faculty: { id: updated.id, email: updated.email, name: updated.name },
  };
}
