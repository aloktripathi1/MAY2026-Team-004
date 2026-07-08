"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Calendar, Compass, Megaphone, ShieldCheck, Sparkles, Users2, Zap } from "lucide-react";
import { clubs, events, announcements } from "@/lib/seed-data";
import { Btn, GlassCard, StatusPill } from "@/components/ui/primitives";
import { pluralize } from "@/lib/format";

export default function Landing() {
  return (
    <div className="relative">
      <MarketingNav />
      <Hero />
      <Marquee />
      <Modules />
      <ClubsSection />
      <EventsSection />
      <RolesSection />
      <TransparencyStrip />
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
        <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
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
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-mono-label !text-[10px] !text-muted-foreground/80">Live</span>
            <span className="text-foreground/60">Now open to all IITM BS clubs</span>
          </div>
          <h1 className="text-5xl leading-[0.95] tracking-[-0.03em] md:text-8xl">
            The <span className="text-display text-primary">confluence</span><br />
            for every IITM BS <span className="text-display italic">society.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            One place for members, events, tasks and announcements — instead of six WhatsApp groups, three Google Forms and a spreadsheet nobody trusts.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup">
              <Btn size="lg" className="accent-glow">Get started free <ArrowUpRight className="h-4 w-4" /></Btn>
            </Link>
            <Link href="/login">
              <Btn size="lg" variant="outline">Sign in to explore</Btn>
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified via IITM BS credentials
            </div>
          </div>
        </motion.div>

        {/* Product surface preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="glass-strong relative mt-16 overflow-hidden rounded-3xl p-3 md:mt-24"
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
              <div className="truncate text-sm">{e.title}</div>
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
            <div className="text-xs leading-snug">{a.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Marquee() {
  const line = ["confluence", "not chaos", "members", "events", "tasks", "issues", "announcements", "one signal"];
  const doubled = [...line, ...line];
  return (
    <div className="relative overflow-hidden border-y border-hairline bg-surface/40 py-6">
      <div className="animate-marquee flex whitespace-nowrap">
        {doubled.map((w, i) => (
          <span key={i} className="flex items-center gap-6 px-6 text-display text-4xl text-muted-foreground/60 md:text-6xl">
            <span className={i % 3 === 1 ? "text-primary" : ""}>{w}</span>
            <span className="text-muted-foreground/30">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Modules() {
  const modules = [
    { icon: Users2, label: "Membership", desc: "Verified signup, directory, approval queues, CSV imports. Roll-number matched.", hue: "122" },
    { icon: Calendar, label: "Events", desc: "Create, RSVP, check-in. Conflict detection, capacity locks, faculty approval flow.", hue: "5" },
    { icon: Megaphone, label: "Announcements", desc: "Only what's relevant to clubs you're in. Pin the important. No spam.", hue: "260" },
    { icon: Compass, label: "Discovery", desc: "Interest-based onboarding. Every club has an active/inactive signal you can trust.", hue: "45" },
    { icon: Zap, label: "Volunteer ops", desc: "Assign tasks, track progress, log contributions for the year-end handover.", hue: "155" },
    { icon: Sparkles, label: "Transparency", desc: "Every event's outcome, spend, and attendance — logged, searchable, exportable.", hue: "320" },
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
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
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

function ClubsSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <div className="mb-10 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div>
          <div className="text-mono-label mb-3">02 · Discovery</div>
          <h2 className="text-4xl tracking-[-0.02em] md:text-5xl">Eight active clubs. <span className="text-display text-primary italic">More every semester.</span></h2>
        </div>
        <Link href="/clubs" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline-flex">See all →</Link>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {clubs.slice(0, 8).map((c) => (
          <Link key={c.id} href="/clubs" className="group">
            <GlassCard className="h-full">
              <div className="mb-4 flex items-start justify-between">
                <div className="text-3xl" style={{ color: `oklch(0.9 0.2 ${c.hue})` }}>{c.emoji}</div>
                <StatusPill tone={c.active ? "lime" : "slate"}>{c.active ? "Active" : "Quiet"}</StatusPill>
              </div>
              <div className="text-sm font-medium">{c.name}</div>
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
        {upcoming.map((e) => (
          <Link key={e.id} href={`/app/events/${e.slug}`}>
            <GlassCard className="group h-full overflow-hidden p-0">
              <div className="relative h-40 overflow-hidden" style={{ background: e.cover }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-3 flex gap-1.5">
                  {e.tags.map(t => <span key={t} className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur">{t}</span>)}
                </div>
                <div className="absolute right-3 top-3 rounded-lg bg-black/50 px-2 py-1 text-mono-label !text-[10px] text-white backdrop-blur">
                  {e.date.split(",")[0]}
                </div>
              </div>
              <div className="p-5">
                <div className="text-mono-label mb-2">{e.club}</div>
                <div className="text-base font-medium leading-snug">{e.title}</div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{e.time} · {e.venue}</span>
                  <span className="text-primary">{e.going} going →</span>
                </div>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RolesSection() {
  const roles = [
    { name: "Club Admin", desc: "Full control of members, events, announcements. Sees the whole club at a glance.", link: "/admin", color: "5" },
    { name: "Event Coordinator", desc: "Creates events, wrangles volunteers, books resources. Owns the day-of ops.", link: "/coordinator", color: "45" },
    { name: "Member", desc: "RSVP, check in, raise issues, follow only the clubs you're in.", link: "/app", color: "122" },
    { name: "Volunteer", desc: "See assigned tasks with deadlines. Update status without pinging the coord.", link: "/volunteer", color: "260" },
    { name: "Faculty Mentor", desc: "Read-only oversight, event approvals, sanity checks. Nothing more.", link: "/faculty", color: "155" },
  ];
  return (
    <section id="roles" className="mx-auto max-w-6xl px-5 py-24">
      <div className="mb-10">
        <div className="text-mono-label mb-3">04 · Built for every role</div>
        <h2 className="text-4xl tracking-[-0.02em] md:text-5xl">One product. <span className="text-display italic text-primary">Five different views.</span></h2>
        <p className="mt-3 max-w-lg text-muted-foreground">Click a role to see its actual dashboard — you'll sign in first, then land right there.</p>
      </div>
      <div className="glass-strong overflow-hidden rounded-3xl">
        {roles.map((r, i) => (
          <Link key={r.name} href={r.link} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-6 border-b border-hairline px-6 py-6 transition hover:bg-surface-2/40 last:border-b-0 md:grid-cols-[64px_1fr_auto] md:px-10">
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
            <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function TransparencyStrip() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <div className="glass-strong relative overflow-hidden rounded-3xl p-10 md:p-16">
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full blur-3xl opacity-40"
          style={{ background: "var(--gradient-hot)" }}
        />
        <div className="text-mono-label mb-4">05 · Transparency</div>
        <h2 className="text-display max-w-2xl text-4xl leading-tight md:text-6xl">
          Every event, its outcome, its spend, its people.
        </h2>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Sangam ships an outcome log by default. Next year's admin inherits history, not folklore. Handovers become one export, not three months of catching up.
        </p>
        <div className="mt-8 grid gap-2 md:grid-cols-3">
          {[["1,592", "students"], ["8", "clubs"], ["27", "events / month"]].map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-background/40 p-5">
              <div className="text-display text-5xl">{v}</div>
              <div className="text-mono-label mt-2">{l}</div>
            </div>
          ))}
        </div>
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
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/signup"><Btn size="lg" className="accent-glow">Create your account</Btn></Link>
          <Link href="/login"><Btn size="lg" variant="outline">Sign in</Btn></Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <div className="text-display text-3xl">sangam</div>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">The confluence for IITM BS clubs. Built by Team Dhurandhar as a Software Engineering capstone.</p>
        </div>
        <FooterCol title="Product" links={[["Modules", "#modules"], ["Clubs", "/clubs"], ["Events", "#events"]]} />
        <FooterCol title="Roles" links={[["Member", "/app"], ["Admin", "/admin"], ["Volunteer", "/volunteer"], ["Faculty", "/faculty"]]} />
        <FooterCol title="Legal" links={[["Terms", "#"], ["Privacy", "#"], ["Contact", "#"]]} />
      </div>
      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 text-xs text-muted-foreground">
          <span>© 2026 Sangam · Team Dhurandhar · IITM BS</span>
          <span className="flex items-center gap-2">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary" /> All systems on
          </span>
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
