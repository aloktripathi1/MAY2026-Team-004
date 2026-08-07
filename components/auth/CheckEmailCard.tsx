"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { Mail } from "lucide-react";
import { Btn } from "@/components/ui/primitives";

export function CheckEmailCard({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function resend() {
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

        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="night-nav rounded-2xl p-5 shadow-[0_42px_120px_-58px_oklch(0.47_0.16_24_/_75%),0_22px_80px_-60px_oklch(0.78_0.13_78_/_60%)] md:p-7"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.055] text-secondary">
            <Mail className="h-5 w-5" />
          </div>
          <div className="text-mono-label mb-3 text-white/[0.52]">Almost there</div>
          <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-5xl">
            Check your email.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/[0.62]">
            {email ? (
              <>
                We sent a verification link to <strong className="text-white/85">{email}</strong>. Open it to
                confirm your account — you&apos;ll land straight in Sangam, no need to sign in again.
              </>
            ) : (
              "We sent a verification link to your institutional email. Open it to confirm your account — you'll land straight in Sangam, no need to sign in again."
            )}
          </p>

          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-white/45">Didn&apos;t get it? Check spam, or send another.</span>
            {sent ? (
              <span className="text-xs text-secondary">A new link is on its way.</span>
            ) : (
              <Btn type="button" variant="outline" size="sm" disabled={busy || !email} onClick={resend}>
                {busy ? "Sending..." : "Resend link"}
              </Btn>
            )}
          </div>
        </motion.div>

        <p className="mt-6 text-center text-xs text-white/45">
          Already verified?{" "}
          <Link href="/login" className="font-semibold text-secondary transition hover:text-white">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
