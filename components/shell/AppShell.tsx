"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  LayoutDashboard, CalendarDays, Users2, MessageSquareWarning, Compass, UserRound,
  Megaphone, ClipboardCheck, LineChart, ScrollText, KeyRound, PlusSquare, Package, ListChecks,
  Shield, Menu, X, LogOut, Ticket,
} from "lucide-react";

type Role = "member" | "coordinator" | "admin" | "volunteer" | "faculty";

const navByRole: Record<Role, { label: string; to: string; icon: any }[]> = {
  member: [
    { label: "Dashboard", to: "/app", icon: LayoutDashboard },
    { label: "Events", to: "/app/events", icon: CalendarDays },
    { label: "Browse clubs", to: "/app/clubs", icon: Compass },
    { label: "My issues", to: "/app/issues", icon: MessageSquareWarning },
    { label: "Profile", to: "/app/profile", icon: UserRound },
  ],
  coordinator: [
    { label: "Events", to: "/coordinator", icon: CalendarDays },
    { label: "New event", to: "/coordinator/new", icon: PlusSquare },
    { label: "Volunteers", to: "/coordinator/volunteers", icon: Users2 },
    { label: "Resources", to: "/coordinator/resources", icon: Package },
  ],
  admin: [
    { label: "Overview", to: "/admin", icon: LayoutDashboard },
    { label: "Members", to: "/admin/members", icon: Users2 },
    { label: "Issues", to: "/admin/issues", icon: Ticket },
    { label: "Approvals", to: "/admin/approvals", icon: ClipboardCheck },
    { label: "Announcements", to: "/admin/announcements", icon: Megaphone },
    { label: "Metrics", to: "/admin/metrics", icon: LineChart },
    { label: "Transparency", to: "/admin/transparency", icon: ScrollText },
    { label: "Handover", to: "/admin/handover", icon: KeyRound },
  ],
  volunteer: [
    { label: "My tasks", to: "/volunteer", icon: ListChecks },
    { label: "Events", to: "/volunteer/events", icon: CalendarDays },
  ],
  faculty: [
    { label: "Oversight", to: "/faculty", icon: Shield },
    { label: "Approvals", to: "/faculty/approvals", icon: ClipboardCheck },
  ],
};

const roleMeta: Record<Role, { name: string; hue: string; badge: string }> = {
  member:      { name: "Member",      hue: "78",  badge: "You" },
  coordinator: { name: "Coordinator", hue: "78",  badge: "Coord" },
  admin:       { name: "Club Admin",  hue: "24",  badge: "Admin" },
  volunteer:   { name: "Volunteer",   hue: "250", badge: "Vol" },
  faculty:     { name: "Faculty",     hue: "155", badge: "Mentor" },
};

export function AppShell({
  role, user = "Ananya Rao", club = "CodeChef IITM BS", children,
}: { role: Role; user?: string; club?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const currentPath = usePathname();
  const items = navByRole[role];
  const meta = roleMeta[role];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile top bar */}
      <div className="night-nav sticky top-0 z-40 flex items-center justify-between px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.12] bg-white/[0.06] text-[13px] font-black text-secondary">SG</span>
          <span className="text-[13px] font-semibold tracking-[0.18em] text-white">SANGAM</span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg border border-white/[0.12] bg-white/[0.04] p-2 text-white"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={[
            "night-nav fixed inset-y-0 left-0 z-30 w-72 shrink-0 rounded-none border-y-0 border-l-0",
            "md:sticky md:top-0 md:h-screen md:translate-x-0 md:block",
            open ? "translate-x-0" : "-translate-x-full",
            "transition-transform duration-300",
          ].join(" ")}
        >
          <div className="flex h-full flex-col p-6 text-sidebar-foreground">
            <Link href="/" className="mb-8 flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.12] bg-white/[0.06] text-[13px] font-black text-secondary">SG</span>
              <span className="text-[14px] font-semibold tracking-[0.2em] text-white">SANGAM</span>
            </Link>

            {/* Role card */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 text-sm font-semibold"
                  style={{ background: `oklch(0.72 0.14 ${meta.hue} / 18%)`, color: `oklch(0.9 0.1 ${meta.hue})` }}
                >
                  {user.split(" ").map(s => s[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-sidebar-foreground" title={user}>{user}</div>
                  <div className="text-xs leading-snug text-sidebar-foreground/65" title={`${club} · ${meta.badge}`}>{club} · {meta.badge}</div>
                </div>
              </div>
            </div>

            <LayoutGroup id={`shell-nav-${role}`}>
              <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hidden">
                {items.map((item) => {
                  const matches = (to: string) =>
                    currentPath === to || (to !== "/" && currentPath.startsWith(`${to}/`));
                  const active =
                    matches(item.to) &&
                    !items.some(
                      (other) =>
                        other.to !== item.to &&
                        other.to.length > item.to.length &&
                        matches(other.to)
                    );
                  return (
                    <Link
                      key={item.to}
                      href={item.to}
                      onClick={() => setOpen(false)}
                      className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors duration-200 hover:bg-white/[0.06] hover:text-sidebar-foreground"
                    >
                      {active && (
                        <motion.span
                          layoutId={`nav-pill-${role}`}
                          className="absolute inset-0 rounded-xl border border-secondary/50 bg-white/[0.075]"
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : { type: "spring", stiffness: 320, damping: 36, mass: 0.9 }
                          }
                        />
                      )}
                      <item.icon
                        className={`relative h-4 w-4 transition-colors duration-200 ${active ? "text-secondary" : ""}`}
                      />
                      <span
                        className={`relative transition-colors duration-200 ${active ? "font-semibold text-sidebar-foreground" : ""}`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </LayoutGroup>

            <div className="mt-2 border-t border-white/10 pt-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/65 transition hover:bg-white/[0.06] hover:text-sidebar-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {open && (
          <div
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Main — exit + enter so sidebar tab switches feel continuous */}
        <main className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentPath}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
              }
              className="mx-auto max-w-7xl px-5 py-8 md:px-10 md:py-12"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow, title, description, actions,
}: { eyebrow?: string; title: ReactNode; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="text-mono-label mb-3">{eyebrow}</div>}
        <h1 className="max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
