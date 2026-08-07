import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppSession } from "@/backend/auth/app-session";
import { listClubRequests } from "@/backend/domain/club-requests";
import { listFaculty } from "@/backend/domain/faculty";
import { PageHeader } from "@/components/shell/AppShell";
import { formatTimeAgo } from "@/lib/format";
import { ClubRequestReview, type ClubRequestRow } from "./ClubRequestReview";
import { FacultyAccess } from "./FacultyAccess";

export const metadata: Metadata = {
  title: "Club proposals · Sangam",
  description: "Review student proposals for new clubs and manage faculty access.",
};

const TABS = [
  { key: "pending", label: "Awaiting review" },
  { key: "decided", label: "Decided" },
] as const;

export default async function FacultyClubRequests({ searchParams }: { searchParams: { tab?: string } }) {
  // The layout already gates on isFaculty; re-checked here so the page is safe
  // on its own if it's ever moved or rendered outside that layout.
  const session = await getAppSession();
  if (!session?.user) redirect("/login");
  if (!session.user.isFaculty) redirect("/app");

  const tab = searchParams.tab === "decided" ? "decided" : "pending";
  const [all, faculty] = await Promise.all([listClubRequests(), listFaculty()]);

  const requests: ClubRequestRow[] = all
    .filter((r) => (tab === "pending" ? r.status === "Pending" : r.status !== "Pending"))
    .map((r) => ({
      id: r.id,
      name: r.name,
      tagline: r.tagline,
      category: r.category,
      description: r.description,
      emoji: r.emoji,
      photo: r.photo,
      status: r.status,
      requesterName: r.requestedBy.name,
      requesterEmail: r.requestedBy.email,
      requesterRoll: r.requestedBy.rollNumber,
      submitted: formatTimeAgo(r.createdAt),
      reviewedBy: r.reviewedBy?.name ?? null,
      reviewNote: r.reviewNote,
      clubSlug: r.createdClub?.slug ?? null,
    }));

  const pendingCount = all.filter((r) => r.status === "Pending").length;

  return (
    <>
      <PageHeader
        title={<>Club <span className="text-secondary">proposals.</span></>}
        description="Approving a proposal creates the club and makes the student who proposed it its first admin."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/faculty/club-requests?tab=${t.key}`}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition ${
              tab === t.key
                ? "border-secondary/55 bg-secondary/[0.12] text-secondary"
                : "border-white/[0.12] bg-white/[0.035] text-muted-foreground hover:border-white/[0.24] hover:text-white"
            }`}
          >
            {t.label}
            {t.key === "pending" && <span className="font-mono text-[11px] opacity-70">{pendingCount}</span>}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <ClubRequestReview requests={requests} />
        </div>
        <FacultyAccess
          faculty={faculty.map((f) => ({
            id: f.id,
            name: f.name,
            email: f.email,
            isSelf: f.id === session.user!.id,
          }))}
        />
      </div>
    </>
  );
}
