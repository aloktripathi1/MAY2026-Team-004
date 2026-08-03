import type { Metadata } from "next";
import { Star } from "lucide-react";
import { requirePageSession } from "@/backend/auth/page-session";
import { prisma } from "@/backend/db/prisma";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard } from "@/components/ui/primitives";
import { formatTimeAgo } from "@/lib/format";
import { FeedbackForm } from "./FeedbackForm";

export const metadata: Metadata = {
  title: "Feedback · Sangam",
  description: "Tell us what's working and what isn't.",
};

/** User-facing feedback widget (#125) — a lightweight channel separate from Issues,
 * for general product feedback rather than a specific broken thing to fix. */
export default async function FeedbackPage() {
  const session = await requirePageSession();

  const myFeedback = await prisma.feedback.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <>
      <PageHeader
        title={<>Share your <span className="text-secondary">feedback.</span></>}
        description="General thoughts on Sangam - not a bug report. For something broken, use Issues instead."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <FeedbackForm />
        <div>
          <div className="mb-4 text-mono-label">Your past feedback</div>
          {myFeedback.length === 0 && (
            <div className="text-sm text-muted-foreground">You haven't sent any feedback yet.</div>
          )}
          <div className="space-y-2">
            {myFeedback.map((f) => (
              <GlassCard key={f.id} className="p-4" hover={false}>
                {f.rating && (
                  <div className="mb-1.5 flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`h-3.5 w-3.5 ${f.rating! >= n ? "fill-secondary text-secondary" : "text-muted-foreground/40"}`} />
                    ))}
                  </div>
                )}
                <div className="text-sm text-white/90">{f.message}</div>
                <div className="mt-1.5 text-xs text-muted-foreground">{formatTimeAgo(f.createdAt)}</div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
