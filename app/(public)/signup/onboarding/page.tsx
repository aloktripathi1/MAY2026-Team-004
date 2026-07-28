import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { getAuthCookieUserId } from "@/backend/auth/session-cookies";
import { prisma } from "@/backend/db/prisma";

export const metadata: Metadata = {
  title: "Onboarding · Sangam",
  description: "Choose interests to personalize Sangam club recommendations.",
};

export default async function SignupOnboardingPage() {
  const userId = getAuthCookieUserId();
  if (!userId) redirect("/signup");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/signup");

  return <OnboardingForm name={user.name} />;
}
