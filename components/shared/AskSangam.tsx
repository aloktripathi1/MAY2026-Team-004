"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, X, Send, CalendarDays, ListChecks, Megaphone, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/backend/auth/roles";
import {
  askSangamConfirmAction,
  askSangamQueryAction,
} from "@/backend/assistant/actions";
import type { AssistantProposedAction } from "@/backend/domain/assistant-types";
import { ToolProposalCard, type ProposalCardState } from "@/components/shared/ToolProposalCard";

type SourceType = "event" | "task" | "announcement" | "membership";

type Message = {
  role: "user" | "assistant";
  text: string;
  sourceType?: SourceType | null;
  sourceLabel?: string;
  sourceHref?: string;
  proposedAction?: AssistantProposedAction;
  proposalState?: ProposalCardState;
  proposalError?: string | null;
  selectedChoiceId?: string | null;
  selectedGroupChoices?: Record<string, string>;
};

function resolveSelectedChoiceId(message: Message): string | null {
  const proposal = message.proposedAction;
  if (!proposal?.choices?.length) return null;
  if (proposal.choiceGroups?.length) {
    const parts: string[] = [];
    for (const group of proposal.choiceGroups) {
      const selected = message.selectedGroupChoices?.[group.id];
      if (!selected) return null;
      parts.push(selected);
    }
    return parts.join("__");
  }
  return message.selectedChoiceId ?? null;
}

/** Role-scoped examples: one chip per capability that shell allows (live Test Club 1 data). */
const EXAMPLE_QUESTIONS: Record<AppRole, string[]> = {
  member: [
    "When's my next event?",
    "What are the latest announcements?",
    "Which clubs am I a member of?",
  ],
  volunteer: [
    "Mark Setup PA System as doing",
    "What tasks am I assigned?",
    "When's my next event?",
    "What are the latest announcements?",
  ],
  coordinator: [
    "Change the first task status to doing",
    "Assign check-in to Pardhiv Nukasani for Test Event 1",
    "Assign Poster design to Soham Reddy and Booth setup to Sai Dutta for Test Event 1",
    "What are the latest announcements?",
  ],
  admin: [
    'Draft an announcement titled "Rehearsal moved" saying rehearsal is moved to Friday for all members',
    'Draft an announcement titled "Rehearsal moved" saying rehearsal is moved to Friday for Purnendu',
    "What are the latest announcements?",
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

function SourceTag({
  sourceType,
  sourceLabel,
  sourceHref,
}: {
  sourceType?: SourceType | null;
  sourceLabel?: string;
  sourceHref?: string;
}) {
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasOpenProposal = messages.some(
    (m) =>
      m.proposedAction &&
      (!m.proposalState ||
        m.proposalState === "pending" ||
        m.proposalState === "accepting" ||
        m.proposalState === "rejecting"),
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
      const result = await askSangamQueryAction({ query: text, role });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const { answer, sourceType, sourceLabel, sourceHref, proposedAction } = result.data;
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: answer,
          sourceType,
          sourceLabel,
          sourceHref,
          proposedAction,
          proposalState: proposedAction ? "pending" : undefined,
          selectedGroupChoices: proposedAction?.defaultGroupSelections
            ? { ...proposedAction.defaultGroupSelections }
            : undefined,
        },
      ]);
    } catch {
      setError("Couldn't reach Ask Sangam. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function decide(messageIndex: number, decision: "accept" | "reject") {
    const message = messages[messageIndex];
    const proposal = message?.proposedAction;
    if (!proposal || pending) return;

    const choiceTokens = proposal.choices?.map((c) => c.token) ?? [];
    const selectedChoiceId = resolveSelectedChoiceId(message);
    const selectedToken =
      proposal.choices && proposal.choices.length > 0
        ? proposal.choices.find((c) => c.id === selectedChoiceId)?.token
        : proposal.token;

    if (decision === "accept" && !selectedToken) {
      setMessages((current) =>
        current.map((m, i) =>
          i === messageIndex
            ? {
                ...m,
                proposalError: proposal.choiceGroups?.length
                  ? "Select who should receive this and when it should send."
                  : "Select an option first.",
              }
            : m,
        ),
      );
      return;
    }

    setMessages((current) =>
      current.map((m, i) =>
        i === messageIndex
          ? { ...m, proposalState: decision === "accept" ? "accepting" : "rejecting", proposalError: null }
          : m,
      ),
    );

    try {
      if (decision === "reject" && choiceTokens.length > 0) {
        for (const token of choiceTokens) {
          await askSangamConfirmAction({ decision: "reject", token });
        }
        setMessages((current) => {
          const next = current.map((m, i) =>
            i === messageIndex ? { ...m, proposalState: "rejected" as const } : m,
          );
          return [
            ...next,
            {
              role: "assistant" as const,
              text: "Okay — I won't make that change.",
              sourceType: null,
            },
          ];
        });
        return;
      }

      const result = await askSangamConfirmAction({
        decision,
        token: selectedToken!,
      });
      if (!result.ok) {
        setMessages((current) =>
          current.map((m, i) =>
            i === messageIndex ? { ...m, proposalState: "pending", proposalError: result.error } : m,
          ),
        );
        return;
      }

      if (decision === "accept" && choiceTokens.length > 0) {
        for (const token of choiceTokens) {
          if (token !== selectedToken) {
            void askSangamConfirmAction({ decision: "reject", token });
          }
        }
      }

      setMessages((current) => {
        const next = current.map((m, i) =>
          i === messageIndex
            ? { ...m, proposalState: decision === "accept" ? ("accepted" as const) : ("rejected" as const) }
            : m,
        );
        return [
          ...next,
          {
            role: "assistant" as const,
            text: result.data.answer,
            sourceType: result.data.sourceType,
            sourceLabel: result.data.sourceLabel,
            sourceHref: result.data.sourceHref,
          },
        ];
      });

      if (decision === "accept") {
        // Soft-refresh RSC payloads so boards/lists pick up the write.
        router.refresh();
      }
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
                      Ask about your events, tasks, approvals, announcements, or club memberships — I&apos;ll
                      answer based on your role.
                    </p>
                    <div className="mt-4 space-y-2">
                      {EXAMPLE_QUESTIONS[role].map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => void ask(question)}
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
                      <div
                        key={index}
                        className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                      >
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
                            <SourceTag
                              sourceType={message.sourceType}
                              sourceLabel={message.sourceLabel}
                              sourceHref={message.sourceHref}
                            />
                          )}
                          {message.role === "assistant" && message.proposedAction && (
                            <ToolProposalCard
                              toolName={message.proposedAction.toolName}
                              summary={message.proposedAction.summary}
                              argsPreview={message.proposedAction.argsPreview}
                              choices={message.proposedAction.choices}
                              choicePrompt={message.proposedAction.choicePrompt}
                              choiceGroups={message.proposedAction.choiceGroups}
                              selectedChoiceId={message.selectedChoiceId}
                              onSelectChoice={(choiceId) =>
                                setMessages((current) =>
                                  current.map((m, i) =>
                                    i === index
                                      ? { ...m, selectedChoiceId: choiceId, proposalError: null }
                                      : m,
                                  ),
                                )
                              }
                              selectedGroupChoices={message.selectedGroupChoices}
                              onSelectGroupChoice={(groupId, optionId) =>
                                setMessages((current) =>
                                  current.map((m, i) =>
                                    i === index
                                      ? {
                                          ...m,
                                          selectedGroupChoices: {
                                            ...(m.selectedGroupChoices ?? {}),
                                            [groupId]: optionId,
                                          },
                                          proposalError: null,
                                        }
                                      : m,
                                  ),
                                )
                              }
                              state={message.proposalState ?? "pending"}
                              error={message.proposalError}
                              onAccept={() => void decide(index, "accept")}
                              onReject={() => void decide(index, "reject")}
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
                  placeholder="Ask Sangam anything…"
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
