import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Create account · Sangam",
  description: "Sign up to Sangam with your IITM BS credentials.",
};

export default function SignupPage() {
  return <AuthShell mode="signup" />;
}
