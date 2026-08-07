"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { Btn } from "@/components/ui/primitives";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[oklch(0.055_0.008_285)] px-5 py-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,oklch(0.47_0.16_24_/_28%),transparent_30%),radial-gradient(circle_at_18%_84%,oklch(0.78_0.13_78_/_10%),transparent_26%),linear-gradient(180deg,oklch(0.075_0.01_285),oklch(0.055_0.008_285)_58%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(oklch(1_0_0_/_3%)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0_/_3%)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_70%_52%_at_54%_28%,black,transparent_75%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col justify-center">
        <Link href="/" className="mb-10 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-9 w-9 rounded-lg" />
          <span className="text-[14px] font-semibold tracking-[0.2em] text-white">SANGAM</span>
        </Link>
        {children}
        <p className="mt-6 text-center text-xs text-white/45">
          <Link href="/login" className="font-semibold text-secondary transition hover:text-white">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

const cardClass =
  "night-nav rounded-2xl p-5 shadow-[0_42px_120px_-58px_oklch(0.47_0.16_24_/_75%),0_22px_80px_-60px_oklch(0.78_0.13_78_/_60%)] md:p-7";

export function ForgotPasswordCard() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? "Something went wrong. Try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Shell>
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className={cardClass}
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.055] text-secondary">
            <Mail className="h-5 w-5" />
          </div>
          <div className="text-mono-label mb-3 text-white/[0.52]">Check your email</div>
          <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-5xl">
            Link sent.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/[0.62]">
            If <strong className="text-white/85">{email}</strong> has a Sangam account, we sent a password reset
            link to it. Open it to choose a new password — the link expires in 1 hour.
          </p>
        </motion.div>
      </Shell>
    );
  }

  return (
    <Shell>
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className={cardClass}
      >
        <div className="mb-8">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.055] text-secondary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="text-mono-label mb-3 text-white/[0.52]">Reset password</div>
          <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-5xl">
            Forgot your password?
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/[0.62]">
            Enter your institutional email and we&apos;ll send you a link to set a new one.
          </p>
        </div>

        <label className="block">
          <div className="text-mono-label mb-1.5 text-white/[0.54]">Institutional email</div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="23s1000123@ds.study.iitm.ac.in"
            className="w-full rounded-xl border border-white/[0.12] bg-white/[0.045] px-4 py-3 text-sm text-white outline-none transition duration-200 placeholder:text-white/[0.28] focus:border-secondary/45 focus:bg-white/[0.07] focus:ring-4 focus:ring-secondary/10"
          />
        </label>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/[0.12] px-3 py-2 text-xs leading-5 text-destructive">
            {error}
          </div>
        )}

        <Btn size="lg" className="mt-6 w-full" disabled={busy}>
          {busy ? "Sending..." : "Send reset link"} <ArrowRight className="h-4 w-4" />
        </Btn>
      </motion.form>
    </Shell>
  );
}
