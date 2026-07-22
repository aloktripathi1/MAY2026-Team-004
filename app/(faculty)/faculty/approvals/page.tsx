import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { EventThumbnail } from "@/components/ui/EventThumbnail";
import { normalizeEventTags } from "@/lib/event-tags";
import { formatEventDate } from "@/lib/format";
import { FacultyApprovalButtons } from "./FacultyApprovalButtons";

export const metadata: Metadata = {
  title: "Faculty approvals · Sangam",
  description: "Approve or block events needing faculty sign-off.",
};

export default async function FacultyApprovals({ searchParams }: { searchParams: { tab?: string } }) {
  const tab: "pending" | "history" = searchParams.tab === "history" ? "history" : "pending";

  const events = await prisma.event.findMany({
    where: tab === "pending" ? { approval: "pending" } : { approval: { not: "pending" } },
    include: { club: true },
    orderBy: { date: tab === "pending" ? "asc" : "desc" },
  });

  return (
    <>
      <PageHeader
        title={<>Events needing <span className="text-secondary">your nod.</span></>}
        description="Off-campus travel, sponsored events, and anything with faculty-only approval."
        actions={
          <div className="night-panel rounded-xl p-1">
            {(["pending", "history"] as const).map(t => (
              <Link key={t} href={`/faculty/approvals?tab=${t}`}
                className={`inline-block rounded-lg px-3.5 py-1.5 text-xs capitalize transition ${tab === t ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {t}
              </Link>
            ))}
          </div>
        }
      />
      <div className="flex flex-col gap-4">
        {events.map(e => (
          <Link key={e.id} href={`/faculty/approvals/${e.slug}`}>
            <GlassCard className="p-6 hover:bg-white/[0.055] transition">
            <div className="grid gap-4 md:grid-cols-[120px_1fr_auto]">
              <div className="relative grid h-24 place-items-center overflow-hidden rounded-xl text-3xl" style={{ background: e.club.banner || e.cover, color: `oklch(0.9 0.2 ${e.club.hue})` }}>
                {e.club.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.club.photo} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  e.club.emoji
                )}
              </div>
              <div className="min-w-0">
                <div className="text-mono-label mb-1">{e.club.name} · {formatEventDate(e.date)}</div>
                <div className="text-lg font-medium">{e.title}</div>
                <div className="mt-2 text-sm text-muted-foreground">{e.description}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {normalizeEventTags(e.tags).map(t => <span key={t} className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-[10px] text-muted-foreground">{t}</span>)}
                  {tab === "pending" && <StatusPill tone="amber">Pending</StatusPill>}
                </div>
              </div>
              {tab === "pending" ? (
                <FacultyApprovalButtons eventId={e.id} />
              ) : (
                <div className="flex items-center gap-2">
                  <StatusPill tone={e.approval === "approved" ? "green" : "magenta"}>
                    {e.approval === "approved" ? "Approved" : "Rejected"}
                  </StatusPill>
                </div>
              )}
            </div>
            </GlassCard>
          </Link>
        ))}
        {events.length === 0 && <div className="night-panel rounded-2xl p-10 text-center text-sm text-muted-foreground">{tab === "pending" ? "Nothing to review. Enjoy your afternoon, Professor." : "No approval history yet."}</div>}
      </div>
    </>
  );
}
