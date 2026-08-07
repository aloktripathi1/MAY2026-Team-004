"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/app/(public)/login/actions";
import { signupAction, type SignupState } from "@/app/(public)/signup/actions";
import { Btn } from "@/components/ui/primitives";

const initialLoginState: LoginState = {};
const initialSignupState: SignupState = {};

export function AuthShell({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[oklch(0.055_0.008_285)] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,oklch(0.47_0.16_24_/_26%),transparent_30%),radial-gradient(circle_at_18%_88%,oklch(0.78_0.13_78_/_10%),transparent_26%),linear-gradient(180deg,oklch(0.075_0.01_285),oklch(0.055_0.008_285)_58%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(oklch(1_0_0_/_3%)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0_/_3%)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_70%_52%_at_54%_28%,black,transparent_75%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col md:flex-row">
        <section className="hidden flex-1 flex-col px-10 py-10 md:flex md:border-r md:border-hairline lg:px-16 xl:px-20">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="h-9 w-9 rounded-lg" />
            <span className="text-[14px] font-semibold tracking-[0.2em] text-white">SANGAM</span>
          </Link>

          <div className="flex flex-1 flex-col justify-center">
            <div className="max-w-3xl">
              <h1 className="max-w-3xl text-6xl font-black leading-[0.92] tracking-[-0.06em] text-white lg:text-7xl">
                {isSignup ? "Enter the control room." : "Welcome back to the room."}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/[0.64]">
                Sangam keeps club membership, events, tasks, approvals, and announcements in one calm operating system.
              </p>
            </div>
          </div>
        </section>

        <section className="relative flex flex-1 items-center justify-center px-5 py-10 md:flex-none md:basis-[480px] md:px-12 lg:basis-[560px] lg:px-16 xl:basis-[640px] xl:px-20 2xl:basis-[720px] 2xl:px-24">
          {/* Pinned outside the vertically-centered card below so it lands at
              the same spot on every mobile auth page, regardless of how tall
              that page's form is (signup's is taller than login's, which
              pushed the logo to a different height when it lived inside the
              centered block). */}
          <Link href="/" className="absolute left-5 top-10 flex items-center gap-3 md:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="h-9 w-9 rounded-lg" />
            <span className="text-[14px] font-semibold tracking-[0.2em] text-white">SANGAM</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            <div className="mb-8">
              {isSignup && <div className="text-mono-label mb-3 text-white/[0.52]">Create account</div>}
              <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.05em] text-white">
                {isSignup ? "Join Sangam." : "Sign in."}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/[0.62]">
                {isSignup
                  ? "Takes less than a minute."
                  : "Use your Sangam account to continue."}
              </p>
            </div>

            {isSignup ? <SignupForm /> : <LoginForm />}

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/[0.56]">
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

function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction] = useFormState(loginAction, initialLoginState);
  const callbackUrl = searchParams.get("callbackUrl") ?? "";
  const needsVerification = state.code === "EMAIL_UNVERIFIED";
  const justReset = searchParams.get("reset") === "success";
  const oauthError = searchParams.get("error");

  return (
    <form className="space-y-4" action={formAction}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {justReset && (
        <p className="rounded-xl border border-secondary/40 bg-secondary/[0.08] px-4 py-3 text-sm text-secondary">
          Password updated. Sign in with your new password.
        </p>
      )}
      {oauthError && <FormError message={oauthError} />}
      <GoogleButton />
      <Divider />
      <Field label="Institutional email" name="email" placeholder="23s1000123@ds.study.iitm.ac.in" type="email" />
      <div>
        <Field label="Password" name="password" placeholder="••••••••" type="password" />
        <Link
          href="/forgot-password"
          className="mt-1.5 inline-block text-xs text-secondary underline underline-offset-2 transition hover:text-white"
        >
          Forgot password?
        </Link>
      </div>
      <FormError message={state.error} />
      {needsVerification && <ResendVerification />}
      <SubmitButton label="Sign in" pendingLabel="Signing in..." />
    </form>
  );
}

/**
 * Shown only after a login is refused for an unverified address — the one
 * moment it's useful, and the point at which someone whose link expired or went
 * to spam would otherwise be stuck with no way forward.
 */
function ResendVerification() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function resend(event: React.MouseEvent<HTMLButtonElement>) {
    // Inside a form, so don't let this submit the login itself.
    event.preventDefault();
    const email = (event.currentTarget.form?.elements.namedItem("email") as HTMLInputElement | null)?.value;
    if (!email) return;

    setBusy(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <p className="text-xs text-muted-foreground">A new verification link is on its way. It expires in 24 hours.</p>;
  }

  return (
    <button
      type="button"
      onClick={resend}
      disabled={busy}
      className="text-xs text-secondary underline underline-offset-2 disabled:opacity-60"
    >
      {busy ? "Sending..." : "Send me a new verification link"}
    </button>
  );
}

function SignupForm() {
  const [state, formAction] = useFormState(signupAction, initialSignupState);

  return (
    <form className="space-y-4" action={formAction}>
      <GoogleButton />
      <Divider />
      <Field label="Full name" name="name" placeholder="Ananya Rao" />
      <Field label="Institutional email" name="email" id="signup-email" placeholder="23s1000123@ds.study.iitm.ac.in" type="email" />
      <Field label="Password" name="password" id="signup-password" placeholder="••••••••" type="password" />
      <FormError message={state.error} />
      <SubmitButton label="Create account" pendingLabel="Creating account..." />
    </form>
  );
}

function GoogleButton() {
  return (
    <a
      href="/api/auth/google"
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.14] bg-white/[0.04] py-3 text-sm font-semibold text-white transition duration-200 hover:border-white/[0.24] hover:bg-white/[0.07]"
    >
      <GoogleIcon className="h-4 w-4" />
      Continue with Google
    </a>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-[11px] uppercase tracking-[0.12em] text-white/40">or</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A24.02 24.02 0 0 0 0 24c0 3.88.92 7.55 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.44-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
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
    <div className="rounded-xl border border-destructive/30 bg-destructive/[0.12] px-3 py-2 text-xs leading-5 text-destructive">
      {message}
    </div>
  );
}

function Field({
  label, name, id, placeholder, type = "text",
}: { label: string; name: string; id?: string; placeholder: string; type?: string }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="block">
      <div className="text-mono-label mb-1.5 text-white/[0.54]">{label}</div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isPassword && visible ? "text" : type}
          required
          placeholder={placeholder}
          className={`w-full rounded-xl border border-white/[0.12] bg-white/[0.045] px-4 py-3 text-sm text-white outline-none transition duration-200 placeholder:text-white/[0.28] focus:border-secondary/45 focus:bg-white/[0.07] focus:ring-4 focus:ring-secondary/10 ${isPassword ? "pr-11" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-white/[0.4] transition hover:text-white/[0.8]"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </label>
  );
}
