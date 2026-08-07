import type { Metadata } from "next";
import { ResetPasswordCard } from "@/components/auth/ResetPasswordCard";

export const metadata: Metadata = {
  title: "Reset password · Sangam",
  description: "Choose a new password for your Sangam account.",
};

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  return <ResetPasswordCard token={searchParams.token ?? ""} />;
}
