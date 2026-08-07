import type { Metadata } from "next";
import { CheckEmailCard } from "@/components/auth/CheckEmailCard";

export const metadata: Metadata = {
  title: "Check your email · Sangam",
  description: "Confirm your institutional email to finish creating your Sangam account.",
};

export default function CheckEmailPage({ searchParams }: { searchParams: { email?: string } }) {
  return <CheckEmailCard email={searchParams.email ?? ""} />;
}
