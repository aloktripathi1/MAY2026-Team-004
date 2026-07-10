"use server";

import { z } from "zod";
import bcrypt from "bcrypt";
import { redirect } from "next/navigation";
import { setAuthCookies } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email("Use a valid email address"),
  password: z.string().min(1, "Password is required"),
  callbackUrl: z.string().optional(),
});

export type LoginState = { error?: string };

function safeRedirect(url?: string | null) {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return "/app";
  return url;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    callbackUrl: formData.get("callbackUrl"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password, callbackUrl } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user?.hashedPassword) {
    return { error: "No Sangam account found for that email." };
  }

  const passwordMatches = await bcrypt.compare(password, user.hashedPassword);
  if (!passwordMatches) {
    return { error: "The email and password do not match." };
  }

  setAuthCookies({ id: user.id, name: user.name, email: user.email, isFaculty: user.isFaculty });
  redirect(safeRedirect(callbackUrl));
}
