import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Sign in · Sangam",
  description: "Sign in to your Sangam account.",
};

export default function LoginPage() {
  return <AuthShell mode="login" />;
}
