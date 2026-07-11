"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Compass,
  LayoutDashboard,
  Megaphone,
  Menu,
  Radio,
  ShieldCheck,
  Users2,
  X,
  Zap,
} from "lucide-react";
import { announcements, clubs, events, faqs, metrics, tasks } from "@/lib/seed-data";

function noEmDash(value: string): string {
  return value.replace(/\s*—\s*/g, " / ");
}

const navLinks = [
  { label: "Modules", href: "#modules", desc: "Membership, events, work and visibility", icon: LayoutDashboard },
  { label: "Roles", href: "#roles", desc: "A focused view for every operator", icon: ShieldCheck },
  { label: "Live", href: "#live", desc: "Counts, activity and current events", icon: Radio },
];

export default function Landing() {
  return (
    <main className="sangam-night min-h-screen overflow-hidden bg-background text-foreground">
      <MarketingNav />
      <Hero />
      <LiveActivity />
      <Modules />
      <Roles />
      <Events />
      <FAQ />
      <ClosingCTA />
      <Footer />
    </main>
  );
}

function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!productOpen) return;
    const onClick = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setProductOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProductOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [productOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header ref={navRef} className="fixed inset-x-0 top-0 z-50 px-4 pt-3 md:px-6">
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between transition-all duration-300 ${
            scrolled
              ? "night-nav h-14 rounded-2xl px-3 shadow-[0_18px_70px_-42px_rgba(0,0,0,0.95)] md:px-4"
              : "h-16 px-1 md:px-0"
          }`}
        >
          <Link href="/" className="group flex items-center gap-3" aria-label="Sangam home">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.12] bg-white/[0.06] text-[13px] font-black text-secondary transition group-hover:border-secondary/45">
              SG
            </span>
            <span className="text-[15px] font-semibold tracking-[0.18em] text-white">SANGAM</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <div className="relative">
              <button
                type="button"
                onClick={() => setProductOpen((value) => !value)}
                aria-expanded={productOpen}
                className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground transition hover:bg-white/[0.06] hover:text-white"
              >
                Product
                <ChevronDown className={`h-3.5 w-3.5 transition ${productOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {productOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    className="night-nav absolute left-1/2 top-full mt-3 w-80 -translate-x-1/2 rounded-2xl p-2"
                  >
                    {navLinks.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setProductOpen(false)}
                        className="group grid grid-cols-[36px_1fr] gap-3 rounded-xl p-3 transition hover:bg-white/[0.06]"
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-secondary transition group-hover:border-secondary/40">
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-white">{item.label}</span>
                          <span className="block text-xs leading-5 text-muted-foreground">{item.desc}</span>
                        </span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Link href="/clubs" className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/[0.06] hover:text-white">
              Clubs
            </Link>
            <Link href="#live" className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/[0.06] hover:text-white">
              Activity
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/[0.06] hover:text-white sm:inline-flex">
              Sign in
            </Link>
            <Link href="/signup" className="gold-cta inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold text-secondary-foreground">
              Join <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/[0.96] px-5 py-4 backdrop-blur-2xl md:hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold tracking-[0.18em] text-white">SANGAM</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="grid h-10 w-10 place-items-center rounded-lg border border-white/[0.12] text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-12 space-y-3">
              {[...navLinks, { label: "Clubs", href: "/clubs", desc: "Browse societies already onboarded", icon: Users2 }].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="grid grid-cols-[44px_1fr] gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.06] text-secondary">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-lg font-semibold text-white">{item.label}</span>
                    <span className="block text-sm text-muted-foreground">{item.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="absolute inset-x-5 bottom-6 grid gap-3">
              <Link href="/signup" onClick={() => setMobileOpen(false)} className="gold-cta flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-secondary-foreground">
                Join Sangam <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="flex h-12 items-center justify-center rounded-xl border border-white/[0.12] text-sm font-medium text-white">
                Sign in
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Hero() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const previewY = useTransform(scrollYProgress, [0, 0.28], [0, shouldReduceMotion ? 0 : -34]);

  return (
    <section className="relative px-4 pb-20 pt-32 md:px-6 md:pb-28 md:pt-44">
      <div className="hero-ambient" aria-hidden="true" />
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-8 md:gap-10">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            <h1 className="max-w-5xl text-[clamp(3.25rem,8.6vw,7.75rem)] font-black leading-[0.9] tracking-[-0.06em] text-white">
              Run the club.<br />Lose the chaos.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl md:leading-9">
              Sangam brings membership, events, volunteers, approvals and announcements into one controlled system for societies that have outgrown scattered chats.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/signup" className="gold-cta inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-secondary-foreground">
                Start with your society <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="/clubs" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/[0.12] px-5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.05]">
                Browse clubs
              </Link>
            </div>
          </motion.div>

          <motion.div
            style={{ y: previewY }}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 28, rotateX: 4 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.1, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="hero-glass relative mx-auto w-full overflow-hidden rounded-[28px] p-3"
          >
            <ProductPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ProductPreview() {
  const [selectedEvent, setSelectedEvent] = useState(events[0].id);
  const currentEvent = events.find((event) => event.id === selectedEvent) ?? events[0];

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0d10]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="mono-label !text-[0.62rem]">LIVE CONTROL ROOM</div>
          <div className="mt-1 text-sm font-semibold text-white">Friday ops summary</div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-primary/35 bg-primary/[0.12] px-2.5 py-1.5 text-xs font-semibold text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary shadow-[0_0_18px_rgba(222,174,86,0.9)]" />
          synced
        </div>
      </div>
      <div className="grid min-h-[560px] gap-px bg-white/10 md:grid-cols-[190px_1fr]">
        <aside className="hidden bg-[#111115] p-4 md:block">
          <div className="space-y-1">
            {["Overview", "Membership", "Events", "Tasks", "Approvals"].map((item, index) => (
              <div key={item} className={`rounded-lg px-3 py-2 text-sm ${index === 0 ? "bg-white/[0.07] text-white" : "text-muted-foreground"}`}>
                {item}
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mono-label !text-[0.58rem]">MEMBERS</div>
            <div className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{metrics.totalMembers.toLocaleString("en-IN")}</div>
            <div className="mt-1 text-xs text-muted-foreground">{metrics.activeMembers.toLocaleString("en-IN")} active this month</div>
          </div>
        </aside>
        <div className="bg-[#0f0f12] p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Events", metrics.eventsThisMonth, "+12%"],
              ["Open issues", metrics.openIssues, "triaged"],
              ["Approvals", 6, "pending"],
            ].map(([label, value, meta]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
                <div className="mono-label !text-[0.58rem]">{label}</div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <span className="font-mono text-3xl font-semibold tracking-[-0.06em] text-white">{value}</span>
                  <span className="text-xs text-secondary">{meta}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_190px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="mono-label !text-[0.58rem]">UPCOMING</div>
                  <div className="mt-1 text-sm font-semibold text-white">Event command queue</div>
                </div>
                <CalendarDays className="h-4 w-4 text-secondary" />
              </div>
              <div className="mt-3 space-y-2">
                {events.slice(0, 4).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedEvent(event.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedEvent === event.id
                        ? "border-secondary/45 bg-secondary/10"
                        : "border-white/10 bg-black/15 hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{noEmDash(event.title)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{event.date} / {event.venue}</div>
                      </div>
                      <span className="font-mono text-xs text-secondary">{event.going}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="mono-label !text-[0.58rem]">SELECTED</div>
              <div className="mt-3 text-lg font-bold leading-tight text-white">{noEmDash(currentEvent.title)}</div>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2"><span>Capacity</span><span className="text-white">{currentEvent.going}/{currentEvent.capacity}</span></div>
                <div className="flex items-center justify-between gap-2"><span>Status</span><span className="text-secondary">{currentEvent.approval}</span></div>
                <div className="flex items-center justify-between gap-2"><span>Venue</span><span className="text-right text-white">{currentEvent.venue}</span></div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.min(100, Math.round((currentEvent.going / currentEvent.capacity) * 100))}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="mono-label !text-[0.58rem]">ANNOUNCEMENTS</div>
              <div className="mt-3 space-y-2">
                {announcements.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-lg bg-black/[0.18] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-white">{item.club}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{item.timeAgo}</span>
                    </div>
                    <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{noEmDash(item.title)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="mono-label !text-[0.58rem]">TASKS</div>
              <div className="mt-3 space-y-2">
                {tasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center gap-2 rounded-lg bg-black/[0.18] px-3 py-2">
                    <CheckCircle2 className={`h-4 w-4 ${task.status === "done" ? "text-secondary" : "text-primary"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-white">{task.title}</div>
                      <div className="font-mono text-[10px] uppercase text-muted-foreground">{task.due}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveActivity() {
  const stats = [
    { label: "students reachable", value: metrics.totalMembers },
    { label: "clubs onboarded", value: clubs.length },
    { label: "events this month", value: metrics.eventsThisMonth },
    { label: "active members", value: metrics.activeMembers },
  ];

  return (
    <section id="live" className="relative px-4 py-20 md:px-6 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-[#101014] p-6">
              <CountUp value={stat.value} />
              <div className="mono-label mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const [display, setDisplay] = useState(shouldReduceMotion ? value : 0);

  useEffect(() => {
    if (!visible || shouldReduceMotion) {
      if (shouldReduceMotion) setDisplay(value);
      return;
    }
    let frame = 0;
    const total = 44;
    const tick = () => {
      frame += 1;
      const progress = 1 - Math.pow(1 - frame / total, 3);
      setDisplay(Math.round(value * progress));
      if (frame < total) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [shouldReduceMotion, value, visible]);

  return (
    <div ref={ref} className="font-mono text-4xl font-semibold tracking-[-0.08em] text-white md:text-5xl">
      {display.toLocaleString("en-IN")}
    </div>
  );
}

function Modules() {
  const modules = [
    { icon: Users2, label: "Membership", number: "01", desc: "Verified joins, roll-number matching, approval queues and searchable directories without sheet drift.", large: true },
    { icon: CalendarDays, label: "Events", number: "02", desc: "Create, approve, RSVP, track capacity and preserve the outcome after the crowd leaves.", large: true },
    { icon: Zap, label: "Volunteer Ops", number: "03", desc: "Tasks move from coordinator memory into visible ownership and due dates." },
    { icon: Megaphone, label: "Announcements", number: "04", desc: "Relevant updates reach the right members without another noisy broadcast group." },
    { icon: Compass, label: "Discovery", number: "05", desc: "Members can see what is alive, what fits them and where to join next." },
    { icon: ShieldCheck, label: "Transparency", number: "06", desc: "Attendance, spend, approvals and handover trails stay available semester after semester." },
  ];

  return (
    <section id="modules" className="px-4 py-20 md:px-6 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="mono-label text-secondary">01 / SYSTEM MAP</p>
          <h2 className="mt-4 text-5xl font-black leading-[0.92] tracking-[-0.05em] text-white md:text-7xl">
            Six modules. One operating rhythm.
          </h2>
        </div>
        <div className="mt-8 grid auto-rows-[minmax(230px,auto)] gap-4 md:grid-cols-4">
          {modules.map((module) => (
            <article
              key={module.label}
              className={`night-panel group flex min-h-[230px] flex-col justify-between rounded-2xl p-5 transition hover:border-secondary/35 ${
                module.large ? "md:col-span-2 md:min-h-[310px]" : "md:col-span-1"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-secondary">
                  <module.icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-xs text-muted-foreground">{module.number}</span>
              </div>
              <div>
                <h3 className={`${module.large ? "text-3xl md:text-4xl" : "text-2xl"} font-black tracking-[-0.04em] text-white`}>
                  {module.label}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{module.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Roles() {
  const roles = [
    { name: "Club Admin", label: "Roster / calendar / finances", desc: "Own membership, publish events, approve announcements and prepare handovers from one high-context view." },
    { name: "Coordinator", label: "Tasks / venues / volunteers", desc: "See capacity, approvals, resources and day-of responsibilities without digging through chat history." },
    { name: "Member", label: "RSVP / clubs / support", desc: "Follow clubs, RSVP, raise issues and see only the updates that matter to their memberships." },
    { name: "Volunteer", label: "Tasks / deadlines / updates", desc: "See assigned tasks with deadlines and update status directly, without pinging the coordinator for every change." },
    { name: "Faculty Mentor", label: "Approvals / oversight", desc: "Review event requests and transparency logs with enough context to say yes quickly." },
  ];
  const [active, setActive] = useState(0);
  const selected = roles[active];

  return (
    <section id="roles" className="px-4 py-20 md:px-6 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p className="mono-label text-secondary">02 / ROLE VIEWS</p>
          <h2 className="mt-4 text-5xl font-black leading-[0.92] tracking-[-0.05em] text-white md:text-7xl">
            Every role gets its own instrument panel.
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
            Sangam changes shape around the person signing in, so work stays visible without giving everyone the same giant admin dashboard.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            {roles.map((role, index) => (
              <button
                key={role.name}
                type="button"
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => setActive(index)}
                className={`min-h-[88px] w-full rounded-2xl border p-5 text-left transition ${
                  active === index ? "border-secondary/45 bg-secondary/10 text-white" : "border-white/10 bg-white/[0.035] text-muted-foreground hover:border-white/20"
                }`}
              >
                <span className="font-mono text-xs">{String(index + 1).padStart(2, "0")}</span>
                <span className="mt-3 block text-lg font-semibold">{role.name}</span>
              </button>
            ))}
          </div>
          <div className="night-panel min-h-[430px] rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="mono-label">{selected.label}</p>
                <h3 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white">{selected.name}</h3>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/20 text-primary">
                <LayoutDashboard className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-6 text-sm leading-7 text-muted-foreground">{selected.desc}</p>
            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <span className="mono-label !text-[0.62rem]">VIEW SNAPSHOT</span>
                <Clock3 className="h-4 w-4 text-secondary" />
              </div>
              <div className="mt-4 space-y-3">
                {roleRows(active).map((row) => (
                  <div key={row[0]} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">{row[0]}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{row[1]}</div>
                    </div>
                    <span className="font-mono text-xs text-secondary">{row[2]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function roleRows(active: number): [string, string, string][] {
  const rows: [string, string, string][][] = [
    [["Import review", "18 pending members from CSV", "18"], ["Fusion Night closeout", "Attendance and spend ready", "94%"], ["Handover", "2 unresolved permissions", "2"]],
    [["Venue request", "Seminar Hall 3 awaits mentor signoff", "1"], ["Volunteer tasks", "3 stuck beyond due time", "3"], ["Capacity check", "Ignite seats remaining", "24"]],
    [["Cook-Off #42", "RSVP open until Sunday 8 PM", "218"], ["Issue update", "Projector ticket moved to in progress", "new"], ["Clubs matched", "Based on interests", "5"]],
    [["Task due today", "Set up amphitheatre PA system", "1"], ["Task update", "Print speaker badges, marked doing", "doing"], ["Weekly load", "3 tasks across 2 events", "3"]],
    [["Event approval", "Startup Weekend budget attached", "open"], ["Transparency log", "Winter Debate Open archived", "done"], ["Risk notes", "Two venue conflicts detected", "2"]],
  ];
  return rows[active] ?? rows[0];
}

function Events() {
  const upcoming = events.filter((event) => event.status === "upcoming").slice(0, 3);
  const totalGoing = useMemo(() => upcoming.reduce((sum, event) => sum + event.going, 0), [upcoming]);

  return (
    <section className="px-4 py-20 md:px-6 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-3 md:grid-cols-3 md:items-end">
          <div className="md:col-span-2">
            <p className="mono-label text-secondary">03 / CURRENT SIGNAL</p>
            <h2 className="mt-4 text-5xl font-black leading-[0.92] tracking-[-0.05em] text-white md:text-7xl">
              The week is already moving.
            </h2>
          </div>
          <div className="night-panel rounded-2xl p-5">
            <div className="font-mono text-5xl font-semibold tracking-[-0.08em] text-white">{totalGoing}</div>
            <div className="mono-label mt-2">students across next 3 events</div>
          </div>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {upcoming.map((event) => (
            <Link key={event.id} href={`/app/events/${event.slug}`} className="group night-panel overflow-hidden rounded-2xl transition hover:border-secondary/35">
              <div className="relative aspect-[16/10] overflow-hidden bg-white/[0.04]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={event.photo} alt="" loading="lazy" className="h-full w-full object-cover opacity-[0.78] grayscale transition duration-500 group-hover:scale-105 group-hover:opacity-95 group-hover:grayscale-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#101014] via-[#101014]/10 to-transparent" />
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                  {event.tags.map((tag) => (
                    <span key={tag} className="rounded-md border border-white/15 bg-black/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-5">
                <div className="mono-label">{noEmDash(event.club)}</div>
                <h3 className="mt-3 text-2xl font-black leading-tight tracking-[-0.04em] text-white">{noEmDash(event.title)}</h3>
                <div className="mt-5 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>{event.date} / {event.time}</span>
                  <span className="font-mono text-secondary">{event.going}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="px-4 py-20 md:px-6 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <p className="mono-label text-secondary">04 / QUESTIONS</p>
          <h2 className="mt-4 text-5xl font-black leading-[0.92] tracking-[-0.05em] text-white md:text-7xl">
            Things people actually ask.
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
            The member help-center questions now live upfront, before someone has to sign in to understand the basics.
          </p>
        </div>

        <div className="night-panel overflow-hidden rounded-2xl">
          {faqs.map((faq, index) => {
            const active = open === index;
            return (
              <button
                key={faq.q}
                type="button"
                onClick={() => setOpen(active ? -1 : index)}
                className="block w-full border-b border-white/10 text-left last:border-b-0"
              >
                <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-5 transition hover:bg-white/[0.035] md:px-6">
                  <span className="text-base font-semibold leading-6 text-white">{faq.q}</span>
                  <span className={`grid h-8 w-8 place-items-center rounded-lg border transition ${
                    active ? "border-secondary/40 bg-secondary/[0.12] text-secondary" : "border-white/10 bg-white/[0.04] text-muted-foreground"
                  }`}>
                    <ChevronDown className={`h-4 w-4 transition ${active ? "rotate-180" : ""}`} />
                  </span>
                </div>
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-6 text-muted-foreground md:px-6">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="relative px-4 py-24 md:px-6 md:py-32">
      <div className="cta-ambient" aria-hidden="true" />
      <div className="mx-auto max-w-6xl">
        <div className="max-w-4xl">
          <p className="mono-label text-secondary">READY WHEN THE SOCIETY IS</p>
          <h2 className="mt-4 text-6xl font-black leading-[0.86] tracking-[-0.06em] text-white md:text-8xl">
            Make the club legible.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Members know what is happening. Coordinators know what is stuck. Faculty can see the trail. That is the whole point.
          </p>
          <div className="mt-8">
            <Link href="/signup" className="gold-cta inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-secondary-foreground">
              Join Sangam <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 md:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 py-14 md:grid-cols-[1fr_auto_auto]">
        <div>
          <div className="text-[15px] font-semibold tracking-[0.18em] text-white">SANGAM</div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            A community operations platform for IITM BS societies, built by Team Dhurandhar.
          </p>
        </div>
        <FooterCol title="Product" links={[["Modules", "#modules"], ["Roles", "#roles"], ["Live activity", "#live"], ["Clubs", "/clubs"]]} />
        <FooterCol title="Access" links={[["Join", "/signup"], ["Sign in", "/login"], ["Events", "/app/events"]]} />
      </div>
      <div className="mx-auto max-w-6xl border-t border-white/10 py-6 text-xs text-muted-foreground">
        All rights reserved.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="mono-label mb-4">{title}</div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="transition hover:text-white">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
