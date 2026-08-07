"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, KeyRound } from "lucide-react";
import { Btn } from "@/components/ui/primitives";

export function ResetPasswordCard({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    if (!token) {
      setError("This reset link is not valid.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? "Something went wrong. Try again.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login?reset=success"), 1800);
    } catch {
      setError("Something went wrong. Try again.");
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

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="night-nav rounded-2xl p-5 shadow-[0_42px_120px_-58px_oklch(0.47_0.16_24_/_75%),0_22px_80px_-60px_oklch(0.78_0.13_78_/_60%)] md:p-7"
        >
          <div className="mb-8">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.055] text-secondary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="text-mono-label mb-3 text-white/[0.52]">Reset password</div>
            <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-5xl">
              {done ? "Password updated." : "Choose a new password."}
            </h1>
            {done && (
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/[0.62]">
                Taking you to sign in with it now...
              </p>
            )}
          </div>

          {!done && (
            <div className="space-y-4">
              <label className="block">
                <div className="text-mono-label mb-1.5 text-white/[0.54]">New password</div>
                <div className="relative">
                  <input
                    type={visible ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/[0.12] bg-white/[0.045] px-4 py-3 pr-11 text-sm text-white outline-none transition duration-200 placeholder:text-white/[0.28] focus:border-secondary/45 focus:bg-white/[0.07] focus:ring-4 focus:ring-secondary/10"
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    tabIndex={-1}
                    aria-label={visible ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-white/[0.4] transition hover:text-white/[0.8]"
                  >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <label className="block">
                <div className="text-mono-label mb-1.5 text-white/[0.54]">Confirm password</div>
                <input
                  type={visible ? "text" : "password"}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/[0.12] bg-white/[0.045] px-4 py-3 text-sm text-white outline-none transition duration-200 placeholder:text-white/[0.28] focus:border-secondary/45 focus:bg-white/[0.07] focus:ring-4 focus:ring-secondary/10"
                />
              </label>

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/[0.12] px-3 py-2 text-xs leading-5 text-destructive">
                  {error}
                </div>
              )}

              <Btn size="lg" className="w-full" disabled={busy}>
                {busy ? "Updating..." : "Update password"} <ArrowRight className="h-4 w-4" />
              </Btn>
            </div>
          )}
        </motion.form>

        <p className="mt-6 text-center text-xs text-white/45">
          <Link href="/login" className="font-semibold text-secondary transition hover:text-white">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
