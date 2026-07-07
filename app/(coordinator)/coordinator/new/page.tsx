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
  const [venues, equipment] = await Promise.all([
    prisma.venue.findMany({ orderBy: { name: "asc" } }),
    prisma.equipment.findMany({ orderBy: { name: "asc" } }),
  ]);
  const resources = [
    ...venues.map((v) => ({ id: v.id, name: v.name, kind: "Venue", detail: `cap ${v.capacity}`, availability: v.availability })),
    ...equipment.map((e) => ({ id: e.id, name: e.name, kind: "Equipment", detail: `qty ${e.quantity}`, availability: e.availability })),
  ];

  return (
    <>
      <PageHeader eyebrow="Compose" title={<>Publish a <span className="text-display text-primary italic">new event.</span></>} description="Sangam will auto-check for venue clashes and route to faculty if needed." />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <GlassCard className="glass-strong p-6">
          <NewEventForm />
        </GlassCard>
        <div className="space-y-4">
          <GlassCard className="bg-warning/5 ring-1 ring-warning/25">
            <div className="mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /><span className="text-mono-label !text-warning">Conflict check</span></div>
            <p className="text-sm">Amphitheatre is booked <b>Fri 7 PM</b> for Fusion Night. Pick another slot or venue.</p>
          </GlassCard>
          <GlassCard>
            <div className="text-mono-label mb-3">Available resources</div>
            <div className="space-y-2 text-sm">
              {resources.map(r => (
                <div key={r.id} className="flex items-center justify-between border-b border-hairline pb-2 last:border-b-0 last:pb-0">
                  <div>
                    <div className="text-sm">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.kind} · {r.detail}</div>
                  </div>
                  <StatusPill tone={r.availability === "Free" ? "green" : "amber"}>{r.availability}</StatusPill>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );
}
