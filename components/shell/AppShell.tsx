"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  LayoutDashboard, CalendarDays, Users2, MessageSquareWarning, Compass, HelpCircle, UserRound,
  Megaphone, ClipboardCheck, LineChart, ScrollText, KeyRound, PlusSquare, Package, ListChecks,
  Shield, Menu, X, LogOut,
} from "lucide-react";
import { RoleSwitcher, type AppRole, type RoleOption } from "@/components/shell/RoleSwitcher";

type Role = AppRole;

const navByRole: Record<Role, { label: string; to: string; icon: any }[]> = {
  member: [
    { label: "Dashboard", to: "/app", icon: LayoutDashboard },
    { label: "Events", to: "/app/events", icon: CalendarDays },
    { label: "Browse clubs", to: "/app/clubs", icon: Compass },
    { label: "My issues", to: "/app/issues", icon: MessageSquareWarning },
    { label: "FAQ", to: "/app/faq", icon: HelpCircle },
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
    { label: "Approvals", to: "/admin/approvals", icon: ClipboardCheck },
    { label: "Announcements", to: "/admin/announcements", icon: Megaphone },
    { label: "Metrics", to: "/admin/metrics", icon: LineChart },
    { label: "Transparency", to: "/admin/transparency", icon: ScrollText },
    { label: "Handover", to: "/admin/handover", icon: KeyRound },
  ],
  volunteer: [
    { label: "My tasks", to: "/volunteer", icon: ListChecks },
  ],
  faculty: [
    { label: "Oversight", to: "/faculty", icon: Shield },
    { label: "Approvals", to: "/faculty/approvals", icon: ClipboardCheck },
  ],
};

const roleMeta: Record<Role, { name: string; hue: string; badge: string }> = {
  member:      { name: "Member",      hue: "122", badge: "You" },
  coordinator: { name: "Coordinator", hue: "45",  badge: "Coord" },
  admin:       { name: "Club Admin",  hue: "5",   badge: "Admin" },
  volunteer:   { name: "Volunteer",   hue: "260", badge: "Vol" },
  faculty:     { name: "Faculty",     hue: "155", badge: "Mentor" },
};

export function AppShell({
  role, user = "Ananya Rao", club = "CodeChef IITM BS", roleOptions = [], children,
}: { role: Role; user?: string; club?: string; roleOptions?: RoleOption[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const currentPath = usePathname();
  const items = navByRole[role];
  const meta = roleMeta[role];

  return (
    <div className="min-h-screen">
      {/* Mobile top bar */}
      <div className="glass-strong sticky top-0 z-40 flex items-center justify-between border-b border-hairline px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-display text-2xl">sangam</span>
          <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-full border border-hairline bg-surface p-2"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={[
            "fixed inset-y-0 left-0 z-30 w-72 shrink-0 border-r border-hairline bg-sidebar/80 backdrop-blur-2xl",
            "md:sticky md:top-0 md:h-screen md:translate-x-0 md:block",
            open ? "translate-x-0" : "-translate-x-full",
            "transition-transform duration-300",
          ].join(" ")}
        >
          <div className="flex h-full flex-col p-6 text-sidebar-foreground">
            <Link href="/" className="mb-8 flex items-center gap-2.5">
              <span className="text-display text-3xl leading-none text-sidebar-foreground">sangam</span>
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-secondary" />
            </Link>

            {/* Role card */}
            <div className="mb-6 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-mono-label mb-2 text-sidebar-foreground/60">Signed in · {meta.name}</div>
              <div className="flex items-center gap-3">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold"
                  style={{ background: `oklch(0.72 0.18 ${meta.hue} / 30%)`, color: `oklch(0.98 0.08 ${meta.hue})` }}
                >
                  {user.split(" ").map(s => s[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-sidebar-foreground" title={user}>{user}</div>
                  <div className="truncate text-xs text-sidebar-foreground/65" title={club}>{club}</div>
                </div>
              </div>
            </div>

            <RoleSwitcher currentRole={role} roles={roleOptions} />

            <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hidden">
              {items.map((item) => {
                const active = currentPath === item.to || (item.to !== "/" && currentPath.startsWith(item.to) && item.to.length > 1 && (currentPath.length === item.to.length || currentPath[item.to.length] === "/"));
                return (
                  <Link
                    key={item.to}
                    href={item.to}
                    onClick={() => setOpen(false)}
                    className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/75 transition hover:bg-white/10 hover:text-sidebar-foreground"
                  >
                    {active && (
                      <motion.span
                        layoutId={`nav-${role}`}
                        className="absolute inset-0 rounded-xl bg-white/15 ring-1 ring-secondary/40"
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      />
                    )}
                    <item.icon className={`relative h-4 w-4 ${active ? "text-secondary" : ""}`} />
                    <span className={`relative ${active ? "font-semibold text-sidebar-foreground" : ""}`}>{item.label}</span>
                    {active && (
                      <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-secondary" />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-2 border-t border-white/10 pt-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/65 transition hover:bg-white/10 hover:text-sidebar-foreground"
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

        {/* Main */}
        <main className="min-w-0 flex-1">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-7xl px-5 py-8 md:px-10 md:py-12"
          >
            {children}
          </motion.div>
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
        <h1 className="text-display text-4xl leading-[1.05] sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
