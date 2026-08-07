import type { Metadata } from "next";
import { CalendarDays, IdCard, Mail } from "lucide-react";
import { requirePageSession } from "@/backend/auth/page-session";
import { prisma } from "@/backend/db/prisma";
import { INTEREST_OPTIONS, parseInterests } from "@/lib/interests";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { NotificationPreferences } from "./NotificationPreferences";
import { EditDetailsModal } from "./EditDetailsModal";
import { parseNotificationPrefs } from "@/lib/notification-prefs";

export const metadata: Metadata = {
  title: "Profile · Sangam",
  description: "Your Sangam profile.",
};

export default async function ProfilePage() {
  const session = await requirePageSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: { include: { club: true } } },
  });

  const primaryMembership = user!.memberships[0];
  const interests = parseInterests(user!.interests);
  const image = user!.image ?? null;

  return (
    <>
      <PageHeader title={<>Your <span className="text-secondary">profile.</span></>} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="night-panel self-start rounded-3xl p-6 text-center">
          <div className="flex justify-center">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={`${user!.name}'s profile`}
                className="h-28 w-28 rounded-2xl border-[3px] border-secondary/25 object-cover"
              />
            ) : (
              <Avatar name={user!.name} size="xl" className="rounded-2xl border-[3px] border-secondary/25" />
            )}
          </div>
          <div className="mt-4 text-3xl font-black leading-none tracking-[-0.05em] text-white">{user!.name}</div>
          {(primaryMembership || user!.isFaculty) && (
            <div className="text-mono-label mt-2">
              {primaryMembership ? `${primaryMembership.club.name} · ${primaryMembership.role}` : "Faculty"}
            </div>
          )}

          <div className="mt-6 space-y-3 border-t border-hairline pt-5 text-left">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{user!.email}</span>
            </div>
            {user!.rollNumber && (
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <IdCard className="h-4 w-4 shrink-0" />
                <span>{user!.rollNumber}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span>Joined {user!.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            </div>
          </div>

          <div className="mt-6">
            <EditDetailsModal name={user!.name} interests={interests} image={image} />
          </div>
        </div>

        <div className="space-y-6">
          <GlassCard>
            <div className="text-mono-label mb-3">Interests</div>
            <div className="flex flex-wrap gap-1.5">
              {INTEREST_OPTIONS.map((t) => {
                const active = interests.includes(t);
                return (
                  <span
                    key={t}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-secondary/40 bg-secondary/[0.12] text-secondary"
                        : "border-white/[0.12] bg-white/[0.035] text-muted-foreground"
                    }`}
                  >
                    {t}
                  </span>
                );
              })}
            </div>
            {interests.length === 0 && (
              <p className="mt-3 text-xs text-muted-foreground">No interests set yet. Edit details to choose some.</p>
            )}
          </GlassCard>

          <GlassCard>
            <div className="text-mono-label mb-3">Memberships</div>
            <div className="space-y-2">
              {user!.memberships.length === 0 && <div className="text-sm text-muted-foreground">No memberships yet.</div>}
              {user!.memberships.map(m => (
                <div key={m.id} className="flex items-center justify-between border-b border-hairline pb-2 last:border-b-0 last:pb-0">
                  <div>
                    <div className="text-sm font-medium">{m.club.name}</div>
                    <div className="text-xs text-muted-foreground">{m.role}</div>
                  </div>
                  <StatusPill tone={m.status === "Active" ? "green" : m.status === "Pending" ? "amber" : "slate"}>{m.status}</StatusPill>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="text-mono-label mb-3">Notification preferences</div>
            <NotificationPreferences initial={parseNotificationPrefs(user!.notificationPrefs)} />
          </GlassCard>
        </div>
      </div>
    </>
  );
}
