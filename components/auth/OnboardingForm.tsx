"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { completeOnboardingAction, type OnboardingState } from "@/app/(public)/signup/onboarding/actions";
import { INTEREST_OPTIONS } from "@/lib/interests";
import { Btn } from "@/components/ui/primitives";

const initialState: OnboardingState = {};

export function OnboardingForm({ name }: { name: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [state, formAction] = useFormState(completeOnboardingAction, initialState);

  function toggleInterest(interest: string) {
    setSelected((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : current.length >= 5
          ? current
          : [...current, interest],
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[oklch(0.055_0.008_285)] px-5 py-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,oklch(0.47_0.16_24_/_28%),transparent_30%),radial-gradient(circle_at_18%_84%,oklch(0.78_0.13_78_/_10%),transparent_26%),linear-gradient(180deg,oklch(0.075_0.01_285),oklch(0.055_0.008_285)_58%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(oklch(1_0_0_/_3%)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0_/_3%)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_70%_52%_at_54%_28%,black,transparent_75%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col justify-center">
        <Link href="/" className="mb-10 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/12 bg-white/[0.06] text-[13px] font-black text-secondary">SG</span>
          <span className="text-[14px] font-semibold tracking-[0.2em] text-white">SANGAM</span>
        </Link>

        <motion.form
          action={formAction}
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="night-nav rounded-2xl p-5 shadow-[0_42px_120px_-58px_oklch(0.47_0.16_24_/_75%),0_22px_80px_-60px_oklch(0.78_0.13_78_/_60%)] md:p-7"
        >
          <div className="mb-8">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-white/12 bg-white/[0.055] text-secondary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-mono-label mb-3 text-white/52">Profile setup</div>
            <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-5xl">
              Tune your discover feed.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
              Welcome, {name}. Pick the areas you want Sangam to prioritize when recommending clubs.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {INTEREST_OPTIONS.map((interest) => {
              const active = selected.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  aria-pressed={active}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition duration-200 active:scale-[0.99] ${
                    active
                      ? "border-secondary/45 bg-secondary/14 text-secondary shadow-[0_18px_48px_-34px_oklch(0.78_0.13_78_/_90%)]"
                      : "border-white/12 bg-white/[0.04] text-white/70 hover:border-white/22 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>

          {selected.map((interest) => (
            <input key={interest} type="hidden" name="interests" value={interest} />
          ))}

          {state.error && selected.length === 0 && (
            <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/12 px-3 py-2 text-xs leading-5 text-destructive">
              {state.error}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/45">
              {selected.length}/5 selected
            </div>
            <OnboardingSubmit disabled={selected.length === 0} />
          </div>
        </motion.form>
      </div>
    </main>
  );
}

function OnboardingSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Btn size="lg" className="w-full sm:w-auto" disabled={pending || disabled}>
      {pending ? "Saving..." : "Finish setup"} <ArrowRight className="h-4 w-4" />
    </Btn>
  );
}
