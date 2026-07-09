"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Calendar, Compass, Megaphone, Sparkles, Users2, Zap } from "lucide-react";
import { clubs, events, announcements } from "@/lib/seed-data";
import { Btn, GlassCard, StatusPill } from "@/components/ui/primitives";
import { pluralize } from "@/lib/format";

// Seed data (club names, event/announcement titles) uses em-dashes as a
// stylistic separator; this page swaps them for the app's other separator
// convention (middot) at render time, without touching the shared strings
// used elsewhere in the app.
function noEmDash(s: string): string {
  return s.replace(/\s*—\s*/g, " · ");
}

// Short form of a club name for compact spots (e.g. the logo strip caption)
// that can't fit "Paradox · Debate Society" — deliberately truncates to the
// part before the separator, rather than normalizing it like noEmDash does.
// The full name is still available elsewhere (e.g. the tooltip).
function shortClubName(name: string): string {
  return noEmDash(name).split(" · ")[0].trim();
}

export default function Landing() {
  return (
    <div className="relative">
      <MarketingNav />
      <Hero />
      <StatsStrip />
      <Modules />
      <ClubsSection />
      <EventsSection />
      <RolesSection />
      <CTA />
      <Footer />
    </div>
  );
}

function MarketingNav() {
  return (
    <header className="sticky top-4 z-40 mx-auto flex max-w-6xl items-center justify-between rounded-full border border-hairline bg-background/60 px-4 py-2.5 backdrop-blur-2xl md:top-6 md:px-5">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-display text-2xl leading-none">sangam</span>
      </Link>
      <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
        <a href="#modules" className="rounded-full px-3 py-1.5 transition hover:bg-surface hover:text-foreground">Product</a>
        <Link href="/clubs" className="rounded-full px-3 py-1.5 transition hover:bg-surface hover:text-foreground">Clubs</Link>
        <a href="#events" className="rounded-full px-3 py-1.5 transition hover:bg-surface hover:text-foreground">Events</a>
        <a href="#roles" className="rounded-full px-3 py-1.5 transition hover:bg-surface hover:text-foreground">Roles</a>
      </nav>
      <div className="flex items-center gap-1.5">
        <Link href="/login" className="hidden rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-surface hover:text-foreground sm:inline-flex">Sign in</Link>
        <Link href="/signup" className="inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90">
          Join <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-24 pt-16 md:pt-28">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      />
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-5xl leading-[0.95] tracking-[-0.03em] md:text-8xl">
            The <span className="text-display text-primary">confluence</span><br />
            for IITM BS <span className="text-display italic">societies.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Every club, one dashboard. No more chasing updates across WhatsApp groups, Google Forms, and spreadsheets nobody trusts.
          </p>
        </motion.div>

        {/* Product surface preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="glass-strong relative mt-12 overflow-hidden rounded-3xl p-3 md:mt-16"
        >
          <div className="grid gap-3 md:grid-cols-[280px_1fr_260px]">
            <FakeSidebarPreview />
            <FakeCenterPreview />
            <FakeRightPreview />
          </div>
          <div className="pointer-events-none absolute inset-x-0 -bottom-24 h-48 bg-gradient-to-t from-background to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}

function FakeSidebarPreview() {
  const items = ["Dashboard", "Events", "Browse clubs", "My issues", "FAQ", "Profile"];
  return (
    <div className="rounded-2xl border border-hairline bg-surface/70 p-4 backdrop-blur">
      <div className="text-display mb-4 text-xl">sangam</div>
      <div className="text-mono-label mb-3">Signed in · Member</div>
      <ul className="space-y-1 text-sm">
        {items.map((it, i) => (
          <li key={it} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${i === 0 ? "bg-surface-2 text-foreground ring-1 ring-hairline" : "text-muted-foreground"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-primary" : "bg-hairline"}`} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
function FakeCenterPreview() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="rounded-2xl border border-hairline bg-surface/40 p-5 backdrop-blur">
      <div className="text-mono-label">This week</div>
      <h3 className="text-display mt-2 text-3xl">{greeting}.</h3>
      <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
        {[["Events", "4"], ["Tasks", "7"], ["Issues", "2"]].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-background/60 p-3">
            <div className="text-muted-foreground">{l}</div>
            <div className="text-display mt-1 text-2xl">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {events.slice(0, 3).map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-xl bg-background/60 p-3">
            <div className="h-10 w-10 shrink-0 rounded-lg" style={{ background: e.cover }} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{noEmDash(e.title)}</div>
              <div className="text-mono-label !text-[9px]">{e.date} · {e.venue}</div>
            </div>
            <div className="text-xs text-primary">RSVP</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function FakeRightPreview() {
  return (
    <div className="rounded-2xl border border-hairline bg-surface/70 p-4 backdrop-blur">
      <div className="text-mono-label mb-3">Announcements</div>
      <div className="space-y-3">
        {announcements.slice(0, 3).map((a) => (
          <div key={a.id} className="rounded-xl bg-background/60 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-mono-label !text-[9px]">{a.club}</span>
              <span className="text-mono-label !text-[9px]">{a.timeAgo}</span>
            </div>
            <div className="text-xs leading-snug">{noEmDash(a.title)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsStrip() {
  const stats: [string, string][] = [
    ["1,592", "students reachable"],
    ["8", "clubs onboarded"],
    ["27", "events / month"],
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 pb-16">
      <div className="grid gap-3 md:grid-cols-3">
        {stats.map(([v, l]) => (
          <div key={l} className="glass rounded-2xl p-5">
            <div className="text-display text-4xl">{v}</div>
            <div className="text-mono-label mt-1.5">{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Modules() {
  const modules = [
    { icon: Users2, label: "Membership", desc: "Verified signup, directory, approval queues, CSV imports. Roll-number matched.", hue: "122" },
    { icon: Calendar, label: "Events", desc: "Create, RSVP, check-in. Conflict detection, capacity locks, faculty approval flow.", hue: "5" },
    { icon: Megaphone, label: "Announcements", desc: "Only what's relevant to clubs you're in. Pin the important. No spam.", hue: "260" },
    { icon: Compass, label: "Discovery", desc: "Interest-based onboarding. Every club has an active/inactive signal you can trust.", hue: "45" },
    { icon: Zap, label: "Volunteer ops", desc: "Assign tasks, track progress, log contributions for the year-end handover.", hue: "155" },
    { icon: Sparkles, label: "Transparency", desc: "Every event's outcome, spend, and attendance: logged, searchable, exportable.", hue: "320" },
  ];
  return (
    <section id="modules" className="mx-auto max-w-6xl px-5 py-24 md:py-32">
      <div className="mb-14 grid gap-6 md:grid-cols-2 md:items-end">
        <div>
          <div className="text-mono-label mb-3">01 · The modules</div>
          <h2 className="text-4xl leading-tight tracking-[-0.02em] md:text-6xl">
            Everything a society runs, <span className="text-display text-primary">under one roof.</span>
          </h2>
        </div>
        <p className="text-muted-foreground md:pl-8">
          Six modules, one shared design. Built for club heads who're tired of context-switching, and members who just want to know what's happening this Friday.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {modules.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.5 }}
          >
            <GlassCard className="relative h-full overflow-hidden p-6">
              <div className="mb-8 flex items-center justify-between">
                <div
                  className="grid h-10 w-10 place-items-center rounded-xl"
                  style={{ background: `oklch(0.72 0.18 ${m.hue} / 20%)`, color: `oklch(0.92 0.20 ${m.hue})` }}
                >
                  <m.icon className="h-4 w-4" />
                </div>
                <span className="text-mono-label">0{i + 1}</span>
              </div>
              <div className="text-lg font-medium">{m.label}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">{m.desc}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function ClubLogoStrip() {
  const doubled = [...clubs, ...clubs];
  return (
    <div className="mb-12">
      <div className="mb-4 text-center text-mono-label text-muted-foreground/70">Active clubs on Sangam</div>
      <div className="glass-strong relative overflow-hidden rounded-3xl py-8 shadow-[0_1px_2px_oklch(0.18_0.02_25_/_4%),0_16px_40px_-20px_oklch(0.18_0.02_25_/_18%)] [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        <div className="animate-logo-scroll flex w-max items-center gap-14 px-8">
          {doubled.map((c, i) => (
            <div key={`${c.id}-${i}`} title={noEmDash(c.name)} className="group flex shrink-0 flex-col items-center gap-2.5">
              <div className="relative">
                <div
                  className="absolute -inset-1.5 rounded-full opacity-0 blur-md transition duration-300 group-hover:opacity-40"
                  style={{ background: `oklch(0.72 0.18 ${c.hue})` }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.banner}
                  alt=""
                  className="relative h-16 w-16 rounded-full object-cover shadow-md ring-2 ring-white transition duration-300 group-hover:scale-110 group-hover:ring-4"
                  style={{ ["--tw-ring-color" as string]: `oklch(0.72 0.18 ${c.hue} / 50%)` }}
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full text-xs ring-2 ring-background"
                  style={{ background: `oklch(0.98 0.01 80)`, color: `oklch(0.5 0.18 ${c.hue})` }}
                >
                  {c.emoji}
                </span>
              </div>
              <span className="text-mono-label !text-[9px] text-muted-foreground/70">{shortClubName(c.name)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClubsSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <div className="mb-10 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div>
          <div className="text-mono-label mb-3">02 · Discovery</div>
          <h2 className="text-4xl tracking-[-0.02em] md:text-5xl">Eight clubs onboarded. <span className="text-display text-primary italic">More every semester.</span></h2>
        </div>
        <Link href="/clubs" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline-flex">See all →</Link>
      </div>
      <ClubLogoStrip />
      <div className="grid gap-3 md:grid-cols-4">
        {clubs.slice(0, 8).map((c) => (
          <Link key={c.id} href="/clubs" className="group">
            <GlassCard className="h-full">
              <div className="mb-4 flex items-start justify-between">
                <div className="text-3xl" style={{ color: `oklch(0.9 0.2 ${c.hue})` }}>{c.emoji}</div>
                <StatusPill tone={c.active ? "lime" : "slate"}>{c.active ? "Active" : "Quiet"}</StatusPill>
              </div>
              <div className="text-sm font-medium">{noEmDash(c.name)}</div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.tagline}</div>
              <div className="mt-4 flex items-center justify-between text-mono-label">
                <span>{c.members} {pluralize(c.members, "member")}</span>
                <span className="opacity-0 transition group-hover:opacity-100">Join →</span>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EventsSection() {
  const upcoming = events.filter(e => e.status === "upcoming").slice(0, 3);
  return (
    <section id="events" className="mx-auto max-w-6xl px-5 py-24">
      <div className="mb-10">
        <div className="text-mono-label mb-3">03 · What's on</div>
        <h2 className="text-4xl tracking-[-0.02em] md:text-5xl">This week on campus.</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {upcoming.map((e) => {
          const club = clubs.find((c) => c.slug === e.clubSlug);
          return (
            <Link key={e.id} href={`/app/events/${e.slug}`}>
              <GlassCard className="group h-full overflow-hidden p-0">
                <div className="relative h-40 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={e.photo}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0" style={{ background: `oklch(0.35 0.1 ${club?.hue ?? "25"} / 25%)` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex gap-1.5">
                    {e.tags.map(t => <span key={t} className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur">{t}</span>)}
                  </div>
                  <div className="absolute right-3 top-3 rounded-lg bg-black/50 px-2 py-1 text-mono-label !text-[10px] text-white backdrop-blur">
                    {e.date.split(",")[0]}
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-mono-label mb-2">{noEmDash(e.club)}</div>
                  <div className="text-base font-medium leading-snug">{noEmDash(e.title)}</div>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{e.time} · {e.venue}</span>
                    <span className="text-primary">{e.going} going →</span>
                  </div>
                </div>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function RolesSection() {
  const roles = [
    { name: "Club Admin", desc: "Full control of members, events, announcements. Sees the whole club at a glance.", color: "5" },
    { name: "Event Coordinator", desc: "Creates events, wrangles volunteers, books resources. Owns the day-of ops.", color: "45" },
    { name: "Member", desc: "RSVP, check in, raise issues, follow only the clubs you're in.", color: "122" },
    { name: "Volunteer", desc: "See assigned tasks with deadlines. Update status without pinging the coord.", color: "260" },
    { name: "Faculty Mentor", desc: "Read-only oversight, event approvals, sanity checks. Nothing more.", color: "155" },
  ];
  return (
    <section id="roles" className="mx-auto max-w-6xl px-5 py-24">
      <div className="mb-10">
        <div className="text-mono-label mb-3">04 · Built for every role</div>
        <h2 className="text-4xl tracking-[-0.02em] md:text-5xl">One product. <span className="text-display italic text-primary">Five different views.</span></h2>
        <p className="mt-3 max-w-lg text-muted-foreground">Sign in once, and Sangam shows you exactly the view your role needs. Nothing more.</p>
      </div>
      <div className="glass-strong overflow-hidden rounded-3xl">
        {roles.map((r, i) => (
          <div key={r.name} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-6 border-b border-hairline px-6 py-6 last:border-b-0 md:grid-cols-[64px_1fr] md:px-10">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-medium"
              style={{ background: `oklch(0.72 0.18 ${r.color} / 15%)`, color: `oklch(0.92 0.20 ${r.color})` }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0">
              <div className="text-xl font-medium md:text-2xl">{r.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{r.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center">
        <Link href="/login">
          <Btn size="lg" variant="outline">See it live, try any role <ArrowUpRight className="h-4 w-4" /></Btn>
        </Link>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <div className="text-center">
        <h2 className="text-display text-5xl leading-none md:text-7xl">Stop juggling tabs.</h2>
        <h2 className="text-5xl leading-none tracking-[-0.02em] md:text-7xl">Start running the club.</h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
          <Link href="/signup"><Btn size="lg" className="accent-glow">Create your account</Btn></Link>
          <Link href="/login" className="text-sm font-medium text-foreground/80 underline-offset-4 transition hover:text-foreground hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <div className="text-display text-3xl">sangam</div>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">The confluence for IITM BS clubs. Built by Team Dhurandhar as a Software Engineering capstone.</p>
        </div>
        <FooterCol title="Product" links={[["Modules", "#modules"], ["Clubs", "/clubs"], ["Events", "#events"]]} />
        <FooterCol title="Legal" links={[["Terms", "#"], ["Privacy", "#"], ["Contact", "#"]]} />
      </div>
      <div className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-5 text-center text-xs text-muted-foreground">
          © 2026 Sangam · Team Dhurandhar · IITM BS
        </div>
      </div>
    </footer>
  );
}
function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-mono-label mb-3">{title}</div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map(([l, h]) => (
          <li key={l}><a href={h} className="transition hover:text-foreground">{l}</a></li>
        ))}
      </ul>
    </div>
  );
}
