"use server";

import { redirect } from "next/navigation";
import { setAuthCookies } from "@/backend/auth/session-cookies";
import { createUserAccount } from "@/backend/auth/create-user";
import { signupSchema } from "@/backend/auth/signup-schema";

export type SignupState = { error?: string; ok?: boolean };

/**
 * Form-based signup (existing UI). Shares validation + create logic with
 * POST /api/auth/signup. Demo session flow remains in
 * backend/auth/mock-session.ts and app/api/auth/[...nextauth].
 */
export async function signupAction(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    rollNumber: formData.get("rollNumber"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await createUserAccount(parsed.data);
  if (!result.ok) {
    return { error: result.message };
  }

  setAuthCookies(result.user.id);
  redirect("/signup/onboarding");
}
