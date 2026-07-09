"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, GraduationCap, HandHelping, ShieldCheck, SquareKanban, User } from "lucide-react";
import { useState } from "react";
import { Btn } from "@/components/ui/primitives";

const DEMO_ROLES = [
  { label: "Member", href: "/app", icon: User },
  { label: "Coordinator", href: "/coordinator", icon: SquareKanban },
  { label: "Volunteer", href: "/volunteer", icon: HandHelping },
  { label: "Admin", href: "/admin", icon: ShieldCheck },
  { label: "Faculty", href: "/faculty", icon: GraduationCap },
];

export function AuthShell({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden md:flex md:flex-col">
        <div className="absolute inset-0" style={{ backgroundImage: "var(--gradient-hero)" }} />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.99 0.005 80) 1px, transparent 1px), linear-gradient(90deg, oklch(0.99 0.005 80) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent 80%)",
          }}
        />
        <div className="relative flex flex-1 flex-col p-12">
          <Link href="/" className="text-display text-3xl text-primary-foreground">sangam</Link>
          <div className="flex flex-1 flex-col justify-center">
            <p className="text-display max-w-md text-balance text-5xl leading-[1.05] text-primary-foreground">
              One place for <span className="text-accent italic">every club, event,</span> and commitment.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link href="/" className="text-display mb-8 inline-block text-2xl md:hidden">sangam</Link>
          <div className="text-mono-label mb-3">{isSignup ? "Create account" : "Welcome back"}</div>
          <h1 className="text-display text-4xl leading-none">
            {isSignup ? <>Join the <span className="text-primary italic">confluence.</span></> : <>Sign in to <span className="text-primary italic">sangam.</span></>}
          </h1>
          {isSignup ? <SignupForm /> : <LoginForm />}

          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>{isSignup ? "Already a member?" : "New here?"}</span>
            <Link href={isSignup ? "/login" : "/signup"} className="text-primary hover:underline">
              {isSignup ? "Sign in →" : "Create account →"}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    setPending(false);
    if (!email || !password) {
      setError("Enter any demo email and password.");
      return;
    }
    const callbackUrl = searchParams.get("callbackUrl");
    router.push(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/app");
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
      <Field label="Institutional email" name="email" placeholder="23s1000123@ds.study.iitm.ac.in" type="email" />
      <Field label="Password" name="password" placeholder="••••••••" type="password" />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Btn size="lg" className="mt-2 w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"} <ArrowRight className="h-4 w-4" />
      </Btn>

      <div className="pt-2">
        <div className="mb-2.5 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">
          <span className="h-px flex-1 bg-hairline" /> Try a role <span className="h-px flex-1 bg-hairline" />
        </div>
        <div className="flex gap-2">
          {DEMO_ROLES.map(({ label, href, icon: Icon }) => (
            <button
              key={label}
              type="button"
              title={`Continue as ${label}`}
              onClick={() => router.push(href)}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-hairline bg-surface/60 py-2.5 text-muted-foreground transition hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
            >
              <Icon className="h-4 w-4" />
              <span className="text-[10px] leading-none">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

const INTERESTS = ["Technical", "Cultural", "Sports", "Design", "Debate", "Entrepreneurship", "Sustainability", "Writing"];

function SignupForm() {
  const router = useRouter();
  const [interests, setInterests] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  function toggleInterest(t: string) {
    setInterests((prev) => (prev.includes(t) ? prev.filter((i) => i !== t) : [...prev, t]));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    window.setTimeout(() => {
      router.push("/app");
    }, 250);
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
      <Field label="Full name" name="name" placeholder="Ananya Rao" />
      <Field label="Institutional email" name="email" id="signup-email" placeholder="23s1000123@ds.study.iitm.ac.in" type="email" />
      <Field label="Roll number" name="rollNumber" placeholder="23s1000123" />
      <Field label="Password" name="password" id="signup-password" placeholder="••••••••" type="password" />
      <div>
        <div className="text-mono-label mb-2">Pick 2–3 interests</div>
        <div className="flex flex-wrap gap-1.5">
          {INTERESTS.map(t => {
            const selected = interests.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleInterest(t)}
                aria-pressed={selected}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  selected
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-hairline bg-surface text-muted-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
      <Btn size="lg" className="mt-2 w-full" disabled={pending}>
        {pending ? "Creating demo…" : "Create demo account"} <ArrowRight className="h-4 w-4" />
      </Btn>
    </form>
  );
}

function Field({
  label, name, id, placeholder, type = "text",
}: { label: string; name: string; id?: string; placeholder: string; type?: string }) {
  return (
    <label className="block">
      <div className="text-mono-label mb-1.5">{label}</div>
      <input
        id={id}
        name={name}
        type={type}
        required
        placeholder={placeholder}
        className="w-full rounded-xl border border-hairline bg-surface/60 px-4 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/60 focus:bg-surface focus:ring-4 focus:ring-primary/10"
      />
    </label>
  );
}
