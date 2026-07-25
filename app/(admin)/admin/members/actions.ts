"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getMockSession } from "@/lib/mock-session";
import { getPrimaryClubMembership } from "@/lib/session-helpers";

const ROLES = ["Member", "Volunteer", "Coordinator", "Admin"] as const;

const memberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  roll: z.string().min(1, "Roll number is required"),
  email: z.string().email("Enter a valid email"),
  role: z.enum(ROLES),
});

async function resolveAdminClub() {
  const session = getMockSession();
  const membership = getPrimaryClubMembership(session!, "Admin");
  const club = await prisma.club.findUnique({ where: { id: membership!.clubId } });
  if (!club) throw new Error("Club not found");
  return club;
}

async function upsertUser(name: string, roll: string, email: string) {
  const existing = await prisma.user.findUnique({ where: { rollNumber: roll } });
  if (existing) return existing;
  return prisma.user.create({
    data: { email, name, rollNumber: roll, hashedPassword: "", interests: "[]", isFaculty: false },
  });
}

export type MemberFormState = { error?: string; ok?: boolean };

export async function addMemberAction(_prevState: MemberFormState, formData: FormData): Promise<MemberFormState> {
  const parsed = memberSchema.safeParse({
    name: formData.get("name"),
    roll: formData.get("roll"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const club = await resolveAdminClub();
  const user = await upsertUser(parsed.data.name, parsed.data.roll, parsed.data.email);

  const existingMembership = await prisma.membership.findUnique({
    where: { userId_clubId: { userId: user.id, clubId: club.id } },
  });
  if (existingMembership) return { error: `${parsed.data.name} is already a member of this club.` };

  await prisma.membership.create({
    data: { userId: user.id, clubId: club.id, role: parsed.data.role, status: "Active", joinedAt: new Date() },
  });

  revalidatePath("/admin/members");
  return { ok: true };
}

export type BulkImportResult = { imported: number; skipped: number; error?: string };

export async function bulkImportMembersAction(csvText: string): Promise<BulkImportResult> {
  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { imported: 0, skipped: 0, error: "The CSV file is empty." };

  const looksLikeHeader = /name/i.test(lines[0]) && /roll/i.test(lines[0]);
  const rows = looksLikeHeader ? lines.slice(1) : lines;
  if (rows.length === 0) return { imported: 0, skipped: 0, error: "No member rows found in the CSV." };

  const club = await resolveAdminClub();
  let imported = 0;
  let skipped = 0;

  for (const line of rows) {
    const [name, roll, email, roleRaw] = line.split(",").map((cell) => cell.trim());
    const role = ROLES.find((r) => r.toLowerCase() === (roleRaw ?? "").toLowerCase()) ?? "Member";
    const parsed = memberSchema.safeParse({ name, roll, email, role });
    if (!parsed.success) {
      skipped += 1;
      continue;
    }

    const user = await upsertUser(parsed.data.name, parsed.data.roll, parsed.data.email);
    const existingMembership = await prisma.membership.findUnique({
      where: { userId_clubId: { userId: user.id, clubId: club.id } },
    });
    if (existingMembership) {
      skipped += 1;
      continue;
    }

    await prisma.membership.create({
      data: { userId: user.id, clubId: club.id, role: parsed.data.role, status: "Active", joinedAt: new Date() },
    });
    imported += 1;
  }

  revalidatePath("/admin/members");
  return { imported, skipped };
}
