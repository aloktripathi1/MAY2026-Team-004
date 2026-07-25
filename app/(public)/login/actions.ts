"use server";

import { z } from "zod";
import bcrypt from "bcrypt";
import { redirect } from "next/navigation";
import { clearAuthCookies, setAuthCookies } from "@/lib/auth-session";
import { homePathForUser } from "@/lib/session-helpers";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email("Use a valid email address"),
  password: z.string().min(1, "Password is required"),
  callbackUrl: z.string().optional(),
});

export type LoginState = { error?: string };

function safeRedirect(url: string | null | undefined, fallback: string) {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return fallback;
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
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { club: true } } },
  });

  if (!user?.hashedPassword) {
    return { error: "No Sangam account found for that email." };
  }

  const passwordMatches = await bcrypt.compare(password, user.hashedPassword);
  if (!passwordMatches) {
    return { error: "The email and password do not match." };
  }

  const memberships = user.memberships.map((m) => ({
    clubId: m.clubId,
    clubSlug: m.club.slug,
    clubName: m.club.name,
    role: m.role,
    personaName: user.name,
  }));

  setAuthCookies({
    id: user.id,
    name: user.name,
    email: user.email,
    isFaculty: user.isFaculty,
    memberships,
  });

  const roleHome = homePathForUser({ isFaculty: user.isFaculty, memberships });
  redirect(safeRedirect(callbackUrl, roleHome));
}

const DEMO_ROLE_PATHS = ["/app", "/coordinator", "/volunteer", "/admin", "/faculty"];

// getMockSession() prefers a real auth cookie over the rich hardcoded demo
// session (which has memberships across several clubs/roles). Without this,
// a visitor who signed up for a real account first — which has zero
// memberships — would have every demo-role link collapse to /app, since
// each persona layout redirects there when it can't find a matching
// membership. Clearing the cookie first restores the demo session so each
// role link actually shows that role's view.
export async function demoRoleAction(formData: FormData) {
  const href = formData.get("href");
  const target = typeof href === "string" && DEMO_ROLE_PATHS.includes(href) ? href : "/app";
  clearAuthCookies();
  redirect(target);
}
