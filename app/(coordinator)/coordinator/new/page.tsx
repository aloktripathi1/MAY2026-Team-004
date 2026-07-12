import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { NewEventForm } from "./NewEventForm";

export const metadata: Metadata = {
  title: "New event · Sangam",
  description: "Create a new event.",
};

export default async function NewEventPage() {


  return (
    <>
      <PageHeader title={<>Publish a <span className="text-secondary">new event.</span></>} description="Sangam will auto-check for venue clashes and route to faculty if needed." />
      <div className="max-w-3xl">
        <GlassCard className="p-6">
          <NewEventForm />
        </GlassCard>
      </div>
    </>
  );
}
