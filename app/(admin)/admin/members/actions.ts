"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/backend/db/prisma";
import { getMockSession } from "@/backend/auth/mock-session";
import { getPrimaryClubMembership } from "@/backend/auth/roles";
import { institutionalEmailSchema } from "@/backend/auth/signup-schema";

const ROLES = ["Member", "Volunteer", "Coordinator", "Admin"] as const;

// Reuses the same institutional-domain check as real signup instead of a bare
// z.string().email() — this form previously accepted any email (e.g. a plain
// gmail.com address) and whitespace-only names/roll numbers (#120).
const memberSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  roll: z.string().trim().min(1, "Roll number is required"),
  email: institutionalEmailSchema,
  role: z.enum(ROLES),
});

type ResolveAdminClubResult =
  | { ok: true; club: Awaited<ReturnType<typeof prisma.club.findUniqueOrThrow>> }
  | { ok: false; error: string };

async function resolveAdminClub(): Promise<ResolveAdminClubResult> {
  const session = await getMockSession();
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  const membership = getPrimaryClubMembership(session, "Admin");
  if (!membership) return { ok: false, error: "You must be a club admin to do this." };

  const club = await prisma.club.findUnique({ where: { id: membership.clubId } });
  if (!club) return { ok: false, error: "Club not found" };
  return { ok: true, club };
}

type UpsertUserResult = { ok: true; user: Awaited<ReturnType<typeof prisma.user.create>> } | { ok: false; error: string };

async function upsertUser(name: string, roll: string, email: string): Promise<UpsertUserResult> {
  const existingByRoll = await prisma.user.findUnique({ where: { rollNumber: roll } });
  if (existingByRoll) return { ok: true, user: existingByRoll };

  // A different roll number can still collide on email (unique in the User
  // model) — check before create so this surfaces as a clean message instead
  // of an unhandled Prisma unique-constraint crash (see issue #76).
  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    return { ok: false, error: `${email} is already registered to a different roll number.` };
  }

  const user = await prisma.user.create({
    data: { email, name, rollNumber: roll, hashedPassword: "", interests: "[]", isFaculty: false },
  });
  return { ok: true, user };
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

  const clubResult = await resolveAdminClub();
  if (!clubResult.ok) return { error: clubResult.error };
  const club = clubResult.club;

  const result = await upsertUser(parsed.data.name, parsed.data.roll, parsed.data.email);
  if (!result.ok) return { error: result.error };
  const user = result.user;

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

const MAX_BULK_IMPORT_ROWS = 500;

export async function bulkImportMembersAction(csvText: string): Promise<BulkImportResult> {
  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { imported: 0, skipped: 0, error: "The CSV file is empty." };

  const looksLikeHeader = /name/i.test(lines[0]) && /roll/i.test(lines[0]);
  const rows = looksLikeHeader ? lines.slice(1) : lines;
  if (rows.length === 0) return { imported: 0, skipped: 0, error: "No member rows found in the CSV." };
  if (rows.length > MAX_BULK_IMPORT_ROWS) {
    return { imported: 0, skipped: 0, error: `CSV has ${rows.length} rows; the limit is ${MAX_BULK_IMPORT_ROWS} per import.` };
  }

  const clubResult = await resolveAdminClub();
  if (!clubResult.ok) return { imported: 0, skipped: 0, error: clubResult.error };
  const club = clubResult.club;
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

    const result = await upsertUser(parsed.data.name, parsed.data.roll, parsed.data.email);
    if (!result.ok) {
      skipped += 1;
      continue;
    }
    const user = result.user;
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
