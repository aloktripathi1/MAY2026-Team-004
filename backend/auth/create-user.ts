import bcrypt from "bcrypt";
import { prisma } from "@/backend/db/prisma";
import type { SignupInput } from "@/backend/auth/signup-schema";
import { sendVerificationEmail } from "@/backend/auth/email-verification";

export type CreateUserResult =
  | {
      ok: true;
      user: {
        id: string;
        name: string;
        email: string;
        rollNumber: string | null;
        isFaculty: boolean;
        createdAt: Date;
      };
    }
  | {
      ok: false;
      code: "EMAIL_EXISTS" | "ROLL_EXISTS";
      message: string;
    };

/**
 * Creates a user account. Does not set cookies — callers (form action or REST
 * route) decide session handling. Mock/demo auth is intentionally separate.
 */
export async function createUserAccount(input: SignupInput): Promise<CreateUserResult> {
  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingEmail) {
    return {
      ok: false,
      code: "EMAIL_EXISTS",
      message: "An account with this email already exists.",
    };
  }

  const existingRoll = await prisma.user.findUnique({
    where: { rollNumber: input.rollNumber },
  });
  if (existingRoll) {
    return {
      ok: false,
      code: "ROLL_EXISTS",
      message: "An account with this roll number already exists.",
    };
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      rollNumber: input.rollNumber,
      hashedPassword,
      interests: "[]",
    },
    select: {
      id: true,
      name: true,
      email: true,
      rollNumber: true,
      isFaculty: true,
      createdAt: true,
    },
  });

  // Hooked here rather than in each caller so the form action and
  // POST /api/auth/signup both verify, and any future signup path inherits it.
  // Best-effort by design: a mail outage must not block account creation.
  await sendVerificationEmail(user);

  return { ok: true, user };
}
