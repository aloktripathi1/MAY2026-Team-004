"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, GraduationCap, HandHelping, LockKeyhole, ShieldCheck, Sparkles, SquareKanban, User } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/app/(public)/login/actions";
import { signupAction, type SignupState } from "@/app/(public)/signup/actions";
import { Btn } from "@/components/ui/primitives";

const initialLoginState: LoginState = {};
const initialSignupState: SignupState = {};

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
    <main className="relative min-h-screen overflow-hidden bg-[oklch(0.055_0.008_285)] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,oklch(0.47_0.16_24_/_26%),transparent_30%),radial-gradient(circle_at_18%_88%,oklch(0.78_0.13_78_/_10%),transparent_26%),linear-gradient(180deg,oklch(0.075_0.01_285),oklch(0.055_0.008_285)_58%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(oklch(1_0_0_/_3%)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0_/_3%)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_70%_52%_at_54%_28%,black,transparent_75%)]" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 px-5 py-6 md:grid-cols-[1fr_470px] md:gap-10 md:px-8 lg:px-10">
        <section className="hidden flex-col justify-between py-6 md:flex">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/12 bg-white/[0.06] text-[13px] font-black text-secondary">SG</span>
            <span className="text-[14px] font-semibold tracking-[0.2em] text-white">SANGAM</span>
          </Link>

          <div className="max-w-3xl pb-12">
            <div className="text-mono-label mb-5 text-white/52">Community operations / IITM BS</div>
            <h1 className="max-w-3xl text-6xl font-black leading-[0.92] tracking-[-0.06em] text-white lg:text-7xl">
              {isSignup ? "Enter the control room." : "Welcome back to the room."}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/64">
              Sangam keeps club membership, events, tasks, approvals, and announcements in one calm operating system.
            </p>
          </div>

          <div className="grid max-w-2xl grid-cols-3 gap-3">
            {["Verified accounts", "Guided onboarding", "Personalized discovery"].map((item) => (
              <div key={item} className="night-panel rounded-2xl p-4">
                <CheckCircle2 className="mb-3 h-4 w-4 text-secondary" />
                <div className="text-xs font-medium leading-5 text-white/76">{item}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-3rem)] items-center justify-center md:min-h-0">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="night-panel w-full max-w-md rounded-2xl p-5 md:p-6"
          >
            <Link href="/" className="mb-8 flex items-center gap-3 md:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/12 bg-white/[0.06] text-[13px] font-black text-secondary">SG</span>
              <span className="text-[14px] font-semibold tracking-[0.2em] text-white">SANGAM</span>
            </Link>

            <div className="mb-8">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-white/12 bg-white/[0.055] text-secondary">
                {isSignup ? <Sparkles className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
              </div>
              <div className="text-mono-label mb-3 text-white/52">{isSignup ? "Create account" : "Secure sign in"}</div>
              <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.05em] text-white">
                {isSignup ? "Join Sangam." : "Sign in."}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/62">
                {isSignup
                  ? "Create your account first. Interests move to the next step so recommendations can use real profile data."
                  : "Use your Sangam account, or jump into a demo role for quick QA passes."}
              </p>
            </div>

            {isSignup ? <SignupForm /> : <LoginForm />}
            {!isSignup && <DemoRoleSwitcher />}

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/56">
              <span>{isSignup ? "Already registered?" : "New to Sangam?"}</span>
              <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-secondary transition hover:text-white">
                {isSignup ? "Sign in" : "Create account"}
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

function DemoRoleSwitcher() {
  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-mono-label text-white/50">Demo switcher</div>
        <span className="rounded-md border border-secondary/25 bg-secondary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-secondary">
          QA
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {DEMO_ROLES.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            title={`Continue as ${label}`}
            aria-label={`Continue as ${label}`}
            className="group flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.035] px-1.5 py-2 text-white/58 transition duration-200 hover:border-secondary/35 hover:bg-secondary/10 hover:text-secondary active:scale-[0.98]"
          >
            <Icon className="h-4 w-4" />
            <span className="max-w-full truncate text-[10px] font-semibold leading-none">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction] = useFormState(loginAction, initialLoginState);
  const callbackUrl = searchParams.get("callbackUrl") ?? "";

  return (
    <form className="space-y-4" action={formAction}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Field label="Institutional email" name="email" placeholder="23s1000123@ds.study.iitm.ac.in" type="email" />
      <Field label="Password" name="password" placeholder="••••••••" type="password" />
      <FormError message={state.error} />
      <SubmitButton label="Sign in" pendingLabel="Signing in..." />
    </form>
  );
}

function SignupForm() {
  const [state, formAction] = useFormState(signupAction, initialSignupState);

  return (
    <form className="space-y-4" action={formAction}>
      <Field label="Full name" name="name" placeholder="Ananya Rao" />
      <Field label="Institutional email" name="email" id="signup-email" placeholder="23s1000123@ds.study.iitm.ac.in" type="email" />
      <Field label="Roll number" name="rollNumber" placeholder="23s1000123" />
      <Field label="Password" name="password" id="signup-password" placeholder="••••••••" type="password" />
      <FormError message={state.error} />
      <SubmitButton label="Create account" pendingLabel="Creating account..." />
    </form>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Btn size="lg" className="mt-2 w-full" disabled={pending}>
      {pending ? pendingLabel : label} <ArrowRight className="h-4 w-4" />
    </Btn>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/12 px-3 py-2 text-xs leading-5 text-destructive">
      {message}
    </div>
  );
}

function Field({
  label, name, id, placeholder, type = "text",
}: { label: string; name: string; id?: string; placeholder: string; type?: string }) {
  return (
    <label className="block">
      <div className="text-mono-label mb-1.5 text-white/54">{label}</div>
      <input
        id={id}
        name={name}
        type={type}
        required
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/12 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none transition duration-200 placeholder:text-white/28 focus:border-secondary/45 focus:bg-white/[0.07] focus:ring-4 focus:ring-secondary/10"
      />
    </label>
  );
}
