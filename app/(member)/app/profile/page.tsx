import type { Metadata } from "next";
import { getMockSession } from "@/lib/mock-session";
import { prisma } from "@/lib/prisma";
import { INTEREST_OPTIONS, parseInterests } from "@/lib/interests";
import { PageHeader } from "@/components/shell/AppShell";
import { GlassCard, StatusPill } from "@/components/ui/primitives";
import { NotificationPreferences } from "./NotificationPreferences";
import { EditDetailsModal } from "./EditDetailsModal";
import { parseNotificationPrefs } from "@/lib/notification-prefs";

export const metadata: Metadata = {
  title: "Profile · Sangam",
  description: "Your Sangam profile.",
};

export default async function ProfilePage() {
  const session = getMockSession();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: { memberships: { include: { club: true } } },
  });

  const initials = (user!.name.split(" ").map((s) => s[0]).slice(0, 2).join("") || "?").toUpperCase();
  const primaryMembership = user!.memberships[0];
  const interests = parseInterests(user!.interests);
  const image = user!.image ?? null;

  return (
    <>
      <PageHeader eyebrow="Account" title={<>Your <span className="text-secondary">profile.</span></>} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="night-panel rounded-3xl p-6">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={`${user!.name}'s profile`}
              className="h-24 w-24 rounded-2xl border border-secondary/25 object-cover"
            />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-2xl border border-secondary/25 bg-secondary/[0.12] text-3xl font-semibold text-secondary">
              {initials}
            </div>
          )}
          <div className="mt-4 text-3xl font-black leading-none tracking-[-0.05em] text-white">{user!.name}</div>
          <div className="text-mono-label mt-2">
            {user!.rollNumber ?? "—"} {primaryMembership ? `· ${primaryMembership.club.name} ${primaryMembership.role}` : ""}
          </div>
          <div className="mt-6 space-y-2 text-sm">
            <Row k="Email" v={user!.email} />
            <Row k="Joined" v={user!.createdAt.toLocaleDateString(undefined, { month: "short", year: "numeric" })} />
          </div>
          <EditDetailsModal name={user!.name} interests={interests} image={image} initials={initials} />
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-hairline pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="truncate">{v}</span>
    </div>
  );
}
