import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { getAuthCookieUser } from "@/backend/auth/session-cookies";

export const metadata: Metadata = {
  title: "Onboarding · Sangam",
  description: "Choose interests to personalize Sangam club recommendations.",
};

export default function SignupOnboardingPage() {
  const user = getAuthCookieUser();
  if (!user) redirect("/signup");

  return <OnboardingForm name={user.name} />;
}
