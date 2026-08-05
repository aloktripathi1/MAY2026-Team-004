"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, X, Send, CalendarDays, ListChecks, Megaphone, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/backend/auth/roles";
import { ToolProposalCard, type ProposalCardState } from "@/components/shared/ToolProposalCard";

type SourceType = "event" | "task" | "announcement" | "membership";

type ProposedAction = {
  toolName: string;
  summary: string;
  argsPreview: Record<string, string>;
  token: string;
  status: "pending";
};

type Message = {
  role: "user" | "assistant";
  text: string;
  sourceType?: SourceType | null;
  sourceLabel?: string;
  sourceHref?: string;
  proposedAction?: ProposedAction;
  proposalState?: ProposalCardState;
  proposalError?: string | null;
};

const EXAMPLE_QUESTIONS: Record<AppRole, string[]> = {
  member: [
    "When's my next event?",
    "What are the latest announcements?",
    "What tasks am I assigned?",
  ],
  coordinator: [
    "What's on my task list?",
    "Mark my first open task as done",
    "Set my first open task to doing",
    "Are any of our events still pending approval?",
  ],
  admin: [
    "What's on my task list?",
    "Mark my first open task as done",
    "How many pending approvals do I have?",
  ],
  volunteer: [
    "What tasks am I assigned?",
    "How many open tasks do I have?",
    "Mark my first open task as done",
    "Set my first open task to doing",
  ],
  faculty: [
    "How many events are awaiting my approval?",
    "What's the next event coming up?",
    "Any recent announcements?",
  ],
};

const SOURCE_META: Record<SourceType, { label: string; icon: typeof CalendarDays }> = {
  event: { label: "Event", icon: CalendarDays },
  task: { label: "Task", icon: ListChecks },
  announcement: { label: "Announcement", icon: Megaphone },
  membership: { label: "Membership", icon: Users2 },
};

function SourceTag({ sourceType, sourceLabel, sourceHref }: { sourceType?: SourceType | null; sourceLabel?: string; sourceHref?: string }) {
  if (!sourceType) return null;
  const meta = SOURCE_META[sourceType];
  const Icon = meta.icon;
  const content = (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary ring-1 ring-secondary/25">
      <Icon className="h-3 w-3" />
      {meta.label}
      {sourceLabel && <span className="normal-case tracking-normal text-secondary/80">· {sourceLabel}</span>}
    </span>
  );
  return sourceHref ? (
    <Link href={sourceHref} className="mt-2 inline-block transition hover:brightness-110">
      {content}
    </Link>
  ) : (
    <div className="mt-2">{content}</div>
  );
}

export function AskSangam({ role }: { role: AppRole }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasOpenProposal = messages.some(
    (m) => m.proposedAction && (!m.proposalState || m.proposalState === "pending" || m.proposalState === "accepting" || m.proposalState === "rejecting"),
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || pending || hasOpenProposal) return;

    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/assistant/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const body = await res.json();

      if (!res.ok || !body.success) {
        setError(body?.error?.message ?? "Ask Sangam couldn't answer that just now.");
        return;
      }

      const { answer, sourceType, sourceLabel, sourceHref, proposedAction } = body.data;
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: answer,
          sourceType,
          sourceLabel,
          sourceHref,
          proposedAction: proposedAction ?? undefined,
          proposalState: proposedAction ? "pending" : undefined,
        },
      ]);
    } catch {
      setError("Couldn't reach Ask Sangam. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function confirmProposal(messageIndex: number, decision: "accept" | "reject") {
    const message = messages[messageIndex];
    if (!message?.proposedAction) return;

    setMessages((current) =>
      current.map((m, i) =>
        i === messageIndex
          ? { ...m, proposalState: decision === "accept" ? "accepting" : "rejecting", proposalError: null }
          : m,
      ),
    );
    setError(null);

    try {
      const res = await fetch("/api/assistant/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, token: message.proposedAction.token }),
      });
      const body = await res.json();

      if (!res.ok || !body.success) {
        setMessages((current) =>
          current.map((m, i) =>
            i === messageIndex
              ? {
                  ...m,
                  proposalState: "pending",
                  proposalError: body?.error?.message ?? "Couldn't complete that action.",
                }
              : m,
          ),
        );
        return;
      }

      const { answer, sourceType, sourceLabel, sourceHref } = body.data;
      setMessages((current) => {
        const next = current.map((m, i) =>
          i === messageIndex
            ? { ...m, proposalState: decision === "accept" ? ("accepted" as const) : ("rejected" as const), proposalError: null }
            : m,
        );
        next.push({
          role: "assistant",
          text: answer,
          sourceType,
          sourceLabel,
          sourceHref,
        });
        return next;
      });
    } catch {
      setMessages((current) =>
        current.map((m, i) =>
          i === messageIndex
            ? { ...m, proposalState: "pending", proposalError: "Couldn't reach Ask Sangam. Try again." }
            : m,
        ),
      );
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask Sangam"
        className="gold-cta fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full text-secondary-foreground"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Ask Sangam"
              className="night-nav fixed inset-y-0 right-0 z-[71] flex w-full max-w-sm flex-col border-y-0 border-r-0"
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-secondary" />
                  <h2 className="text-sm font-semibold text-white">Ask Sangam</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.12] bg-white/[0.04] text-muted-foreground transition hover:border-white/[0.24] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-5">
                {messages.length === 0 ? (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Ask about your events, tasks, approvals, announcements, or club memberships — I&apos;ll answer based on your role. Task changes need your Accept.
                    </p>
                    <div className="mt-4 space-y-2">
                      {EXAMPLE_QUESTIONS[role].map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => ask(question)}
                          disabled={pending || hasOpenProposal}
                          className="block w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-3.5 py-2.5 text-left text-sm text-white/[0.85] transition hover:border-secondary/35 hover:bg-white/[0.06] hover:text-secondary disabled:opacity-50"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message, index) => (
                      <div key={index} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                            message.role === "user"
                              ? "bg-secondary/[0.16] text-white ring-1 ring-secondary/30"
                              : "border border-white/[0.1] bg-white/[0.035] text-white/[0.9]",
                          )}
                        >
                          {message.text}
                          {message.role === "assistant" && (
                            <SourceTag sourceType={message.sourceType} sourceLabel={message.sourceLabel} sourceHref={message.sourceHref} />
                          )}
                          {message.role === "assistant" && message.proposedAction && (
                            <ToolProposalCard
                              toolName={message.proposedAction.toolName}
                              summary={message.proposedAction.summary}
                              argsPreview={message.proposedAction.argsPreview}
                              state={message.proposalState ?? "pending"}
                              error={message.proposalError}
                              onAccept={() => void confirmProposal(index, "accept")}
                              onReject={() => void confirmProposal(index, "reject")}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                    {pending && (
                      <div className="flex justify-start">
                        <div className="rounded-2xl border border-white/[0.1] bg-white/[0.035] px-4 py-2.5 text-sm text-muted-foreground">
                          Thinking…
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void ask(input);
                }}
                className="flex shrink-0 items-center gap-2 border-t border-white/10 p-4"
              >
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={hasOpenProposal ? "Accept or reject the pending action…" : "Ask Sangam anything…"}
                  disabled={pending || hasOpenProposal}
                  className="min-w-0 flex-1 rounded-xl border border-white/[0.12] bg-white/[0.035] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-secondary/55 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={pending || hasOpenProposal || !input.trim()}
                  aria-label="Send"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-secondary/40 bg-secondary/[0.14] text-secondary transition hover:bg-secondary/[0.22] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
