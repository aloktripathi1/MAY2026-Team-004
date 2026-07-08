"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import { Btn } from "@/components/ui/primitives";
import { signupAction, type SignupState } from "@/app/(public)/signup/actions";

export function AuthShell({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden md:block">
        <div className="absolute inset-0" style={{ backgroundImage: "var(--gradient-hero)" }} />
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <Link href="/" className="text-display text-3xl">sangam</Link>
          <div>
            <div className="text-mono-label mb-4">Manifesto</div>
            <p className="text-display max-w-md text-5xl leading-[1.05]">
              A club is not <span className="text-primary italic">a WhatsApp group</span>. It's a body of people, a schedule, a set of promises. Sangam gives it a home.
            </p>
            <div className="mt-8 text-sm text-muted-foreground">— Team Dhurandhar</div>
          </div>
          <div className="text-xs text-muted-foreground">Sangam · IITM BS</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="glass-strong w-full max-w-md rounded-3xl p-8"
        >
          <Link href="/" className="text-display mb-8 inline-block text-2xl md:hidden">sangam</Link>
          <div className="text-mono-label mb-3">{isSignup ? "Create account" : "Welcome back"}</div>
          <h1 className="text-display text-4xl leading-none">
            {isSignup ? <>Join the <span className="text-primary italic">confluence.</span></> : <>Sign in to <span className="text-primary italic">sangam.</span></>}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {isSignup ? "Verified with your IITM BS credentials. Takes 30 seconds." : "Use your IITM BS credentials."}
          </p>

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
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    setPending(false);
    if (result?.error) {
      setError("Incorrect email or password.");
      return;
    }
    // Honor the callbackUrl middleware attaches when it redirects an
    // unauthenticated visit to /login (e.g. clicking "Faculty Mentor" on the
    // landing page while signed out) so sign-in lands them where they meant
    // to go, not always on the member dashboard.
    const callbackUrl = searchParams.get("callbackUrl");
    router.push(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/app");
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
      <Field label="Institutional email" name="email" placeholder="23f1000123@ds.study.iitm.ac.in" type="email" />
      <Field label="Password" name="password" placeholder="••••••••" type="password" />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Btn size="lg" className="mt-2 w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"} <ArrowRight className="h-4 w-4" />
      </Btn>
    </form>
  );
}

const initialSignupState: SignupState = {};

const INTERESTS = ["Technical", "Cultural", "Sports", "Design", "Debate", "Entrepreneurship", "Sustainability", "Writing"];

function SignupForm() {
  const router = useRouter();
  const [state, formAction] = useFormState(signupAction, initialSignupState);
  const [redirecting, setRedirecting] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);

  function toggleInterest(t: string) {
    setInterests((prev) => (prev.includes(t) ? prev.filter((i) => i !== t) : [...prev, t]));
  }

  useEffect(() => {
    if (!state.ok || redirecting) return;
    setRedirecting(true);
    const email = (document.getElementById("signup-email") as HTMLInputElement)?.value;
    const password = (document.getElementById("signup-password") as HTMLInputElement)?.value;
    signIn("credentials", { email, password, redirect: false }).then(() => {
      router.push("/app");
      router.refresh();
    });
  }, [state.ok, redirecting, router]);

  return (
    <form className="mt-8 space-y-4" action={formAction}>
      <Field label="Full name" name="name" placeholder="Ananya Rao" />
      <Field label="Institutional email" name="email" id="signup-email" placeholder="23f1000123@ds.study.iitm.ac.in" type="email" />
      <Field label="Roll number" name="rollNumber" placeholder="23f1000123" />
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
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Btn size="lg" className="mt-2 w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create account"} <ArrowRight className="h-4 w-4" />
    </Btn>
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
