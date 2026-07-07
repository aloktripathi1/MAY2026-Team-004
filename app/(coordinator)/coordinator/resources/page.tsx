import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill, Btn } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Resources · Sangam",
  description: "Book halls, projectors and equipment.",
};

export default async function ResourcesPage() {
  const [venues, equipment] = await Promise.all([
    prisma.venue.findMany({ orderBy: { name: "asc" } }),
    prisma.equipment.findMany({ orderBy: { name: "asc" } }),
  ]);
  const slots = ["9 AM", "11 AM", "1 PM", "3 PM", "5 PM", "7 PM", "9 PM"];

  return (
    <>
      <PageHeader eyebrow="Booking" title={<>Halls, gear, <span className="text-display text-primary italic">no clashes.</span></>} description="Real-time conflict detection. Locks the slot the moment you confirm." />

      <div className="text-mono-label mb-3">Venues</div>
      <div className="grid gap-3 md:grid-cols-3">
        {venues.map(v => (
          <GlassCard key={v.id} className="p-5">
            <div className="mb-3 flex items-start justify-between">
              <div className="text-mono-label">Venue</div>
              <StatusPill tone={v.availability === "Free" ? "green" : "amber"}>{v.availability === "Free" ? "Available" : "Booked"}</StatusPill>
            </div>
            <div className="text-lg font-medium">{v.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">Capacity {v.capacity}</div>
            <Btn size="sm" variant="outline" className="mt-4 w-full">Book slot</Btn>
          </GlassCard>
        ))}
      </div>

      <div className="text-mono-label mb-3 mt-10">Equipment</div>
      <div className="grid gap-3 md:grid-cols-3">
        {equipment.map(e => (
          <GlassCard key={e.id} className="p-5">
            <div className="mb-3 flex items-start justify-between">
              <div className="text-mono-label">Equipment</div>
              <StatusPill tone={e.availability === "Free" ? "green" : "amber"}>{e.availability === "Free" ? "Available" : "Booked"}</StatusPill>
            </div>
            <div className="text-lg font-medium">{e.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">Qty {e.quantity}</div>
            <Btn size="sm" variant="outline" className="mt-4 w-full">Book slot</Btn>
          </GlassCard>
        ))}
      </div>

      <div className="mt-10">
        <div className="text-mono-label mb-3">Amphitheatre · this week</div>
        <div className="glass-strong overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-hairline">
            <div className="text-mono-label border-r border-hairline px-3 py-2">Slot</div>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
              <div key={d} className="text-mono-label border-r border-hairline px-3 py-2 last:border-r-0 text-center">{d}</div>
            ))}
          </div>
          {slots.map((s, i) => (
            <div key={s} className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-hairline last:border-b-0">
              <div className="text-mono-label border-r border-hairline px-3 py-3">{s}</div>
              {Array.from({ length: 7 }).map((_, j) => {
                const booked = (i + j) % 5 === 0 || (i === 5 && j === 4);
                return (
                  <div key={j} className="border-r border-hairline p-1.5 last:border-r-0">
                    <div className={`h-full rounded-md p-2 text-[10px] ${booked ? "bg-secondary/20 text-secondary" : "bg-surface/40 hover:bg-primary/10 hover:text-primary transition cursor-pointer"}`}>
                      {booked ? "Sarga" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
