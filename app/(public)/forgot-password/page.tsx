import type { Metadata } from "next";
import { ForgotPasswordCard } from "@/components/auth/ForgotPasswordCard";

export const metadata: Metadata = {
  title: "Forgot password · Sangam",
  description: "Reset your Sangam account password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordCard />;
}
