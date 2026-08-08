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
import { Btn } from "@/components/ui/primitives";

type SourceType = "event" | "task" | "announcement" | "membership";

type ProposalSlot = {
  action: AssistantProposedAction;
  state: ProposalCardState;
  error?: string | null;
  selectedChoiceId?: string | null;
  selectedGroupChoices?: Record<string, string>;
};

type Message = {
  role: "user" | "assistant";
  text: string;
  sourceType?: SourceType | null;
  sourceLabel?: string;
  sourceHref?: string;
  proposals?: ProposalSlot[];
  batchError?: string | null;
};

function isOpenProposalState(state: ProposalCardState | undefined): boolean {
  return !state || state === "pending" || state === "accepting" || state === "rejecting";
}

function resolveSelectedChoiceId(slot: ProposalSlot): string | null {
  const proposal = slot.action;
  if (!proposal.choices?.length) return null;
  if (proposal.choiceGroups?.length) {
    const parts: string[] = [];
    for (const group of proposal.choiceGroups) {
      const selected = slot.selectedGroupChoices?.[group.id];
      if (!selected) return null;
      parts.push(selected);
    }
    return parts.join("__");
  }
  return slot.selectedChoiceId ?? null;
}

function slotNeedsChoice(slot: ProposalSlot): boolean {
  return Boolean(slot.action.choices && slot.action.choices.length > 0);
}

function slotHasChoiceSelected(slot: ProposalSlot): boolean {
  if (!slotNeedsChoice(slot)) return true;
  return Boolean(resolveSelectedChoiceId(slot));
}

/** Role-scoped examples grounded in current Test Club 1 DB + shell capabilities. */
const EXAMPLE_QUESTIONS: Record<AppRole, string[]> = {
  member: [
    "Which clubs am I a member of?",
    "When's my next event?",
    "What are the latest announcements?",
  ],
  volunteer: [
    'Mark "Setup PA System" as doing',
    "What tasks am I assigned?",
    "When's my next event?",
    "What are the latest announcements?",
  ],
  coordinator: [
    'Mark "Setup PA System" as doing',
    "Assign booth setup to Pardhiv Nukasani for Test Event 1",
    'Mark "Independence Day Function Approval" as doing, also assign check-in to Pardhiv Nukasani for Test Event 1',
    "List active volunteers",
    "Who has the most open tasks?",
  ],
  admin: [
    'Draft an announcement titled "Team sync" saying sync is Friday at 5pm for all members',
    'Draft an announcement titled "Volunteer note" saying check the board for Pardhiv Nukasani',
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

function toProposalSlots(actions: AssistantProposedAction[]): ProposalSlot[] {
  return actions.map((action) => ({
    action,
    state: "pending" as const,
    selectedGroupChoices: action.defaultGroupSelections
      ? { ...action.defaultGroupSelections }
      : undefined,
  }));
}

export function AskSangam({ role }: { role: AppRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasOpenProposal = messages.some((m) =>
    m.proposals?.some((slot) => isOpenProposalState(slot.state)),
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

      const { answer, sourceType, sourceLabel, sourceHref, proposedAction, proposedActions } =
        result.data;
      const actions =
        proposedActions && proposedActions.length > 0
          ? proposedActions
          : proposedAction
            ? [proposedAction]
            : [];

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: answer,
          sourceType,
          sourceLabel,
          sourceHref,
          proposals: actions.length > 0 ? toProposalSlots(actions) : undefined,
        },
      ]);
    } catch {
      setError("Couldn't reach Ask Sangam. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function updateSlot(
    messageIndex: number,
    actionIndex: number,
    patch: Partial<ProposalSlot>,
  ) {
    setMessages((current) =>
      current.map((m, i) => {
        if (i !== messageIndex || !m.proposals) return m;
        return {
          ...m,
          batchError: null,
          proposals: m.proposals.map((slot, j) => (j === actionIndex ? { ...slot, ...patch } : slot)),
        };
      }),
    );
  }

  async function decide(messageIndex: number, actionIndex: number, decision: "accept" | "reject") {
    const message = messages[messageIndex];
    const slot = message?.proposals?.[actionIndex];
    if (!slot || pending) return;
    if (!isOpenProposalState(slot.state) || slot.state === "accepting" || slot.state === "rejecting") {
      return;
    }

    const proposal = slot.action;
    const choiceTokens = proposal.choices?.map((c) => c.token) ?? [];
    const selectedChoiceId = resolveSelectedChoiceId(slot);
    const selectedToken =
      proposal.choices && proposal.choices.length > 0
        ? proposal.choices.find((c) => c.id === selectedChoiceId)?.token
        : proposal.token;

    if (decision === "accept" && !selectedToken) {
      updateSlot(messageIndex, actionIndex, {
        error: proposal.choiceGroups?.length
          ? "Select who should receive this and when it should send."
          : "Select an option first.",
      });
      return;
    }

    updateSlot(messageIndex, actionIndex, {
      state: decision === "accept" ? "accepting" : "rejecting",
      error: null,
    });

    try {
      if (decision === "reject" && choiceTokens.length > 0) {
        for (const token of choiceTokens) {
          await askSangamConfirmAction({ decision: "reject", token });
        }
        setMessages((current) => {
          const next = current.map((m, i) => {
            if (i !== messageIndex || !m.proposals) return m;
            return {
              ...m,
              proposals: m.proposals.map((s, j) =>
                j === actionIndex ? { ...s, state: "rejected" as const } : s,
              ),
            };
          });
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
        updateSlot(messageIndex, actionIndex, { state: "pending", error: result.error });
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
        const next = current.map((m, i) => {
          if (i !== messageIndex || !m.proposals) return m;
          return {
            ...m,
            proposals: m.proposals.map((s, j) =>
              j === actionIndex
                ? {
                    ...s,
                    state: decision === "accept" ? ("accepted" as const) : ("rejected" as const),
                  }
                : s,
            ),
          };
        });
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
        router.refresh();
      }
    } catch {
      updateSlot(messageIndex, actionIndex, {
        state: "pending",
        error: "Couldn't reach Ask Sangam. Try again.",
      });
    }
  }

  /**
   * Batch confirm that stops Accept all on first failure (per plan).
   * Reject all continues through all pending cards.
   */
  async function decideAllBatched(messageIndex: number, decision: "accept" | "reject") {
    const snapshot = messages[messageIndex];
    if (!snapshot?.proposals || snapshot.proposals.length < 2 || pending) return;

    const pendingIndexes = snapshot.proposals
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.state === "pending")
      .map(({ index }) => index);

    if (pendingIndexes.length === 0) return;

    if (decision === "accept") {
      const missingChoice = pendingIndexes.some(
        (i) => !slotHasChoiceSelected(snapshot.proposals![i]!),
      );
      if (missingChoice) {
        setMessages((current) =>
          current.map((m, i) =>
            i === messageIndex ? { ...m, batchError: "Select options on each card first." } : m,
          ),
        );
        return;
      }
    }

    setPending(true);
    setMessages((current) =>
      current.map((m, i) => (i === messageIndex ? { ...m, batchError: null } : m)),
    );

    try {
      for (const actionIndex of pendingIndexes) {
        // Capture latest slot selections from React state via updater side channel.
        let slot: ProposalSlot | undefined;
        setMessages((current) => {
          slot = current[messageIndex]?.proposals?.[actionIndex];
          return current;
        });
        if (!slot || slot.state !== "pending") continue;

        const proposal = slot.action;
        const choiceTokens = proposal.choices?.map((c) => c.token) ?? [];
        const selectedChoiceId = resolveSelectedChoiceId(slot);
        const selectedToken =
          proposal.choices && proposal.choices.length > 0
            ? proposal.choices.find((c) => c.id === selectedChoiceId)?.token
            : proposal.token;

        if (decision === "accept" && !selectedToken) {
          updateSlot(messageIndex, actionIndex, {
            error: "Select an option first.",
          });
          break;
        }

        updateSlot(messageIndex, actionIndex, {
          state: decision === "accept" ? "accepting" : "rejecting",
          error: null,
        });

        try {
          if (decision === "reject" && choiceTokens.length > 0) {
            for (const token of choiceTokens) {
              await askSangamConfirmAction({ decision: "reject", token });
            }
            updateSlot(messageIndex, actionIndex, { state: "rejected" });
            setMessages((current) => [
              ...current,
              {
                role: "assistant" as const,
                text: "Okay — I won't make that change.",
                sourceType: null,
              },
            ]);
            continue;
          }

          const result = await askSangamConfirmAction({
            decision,
            token: selectedToken!,
          });

          if (!result.ok) {
            updateSlot(messageIndex, actionIndex, { state: "pending", error: result.error });
            if (decision === "accept") break;
            continue;
          }

          if (decision === "accept" && choiceTokens.length > 0) {
            for (const token of choiceTokens) {
              if (token !== selectedToken) {
                void askSangamConfirmAction({ decision: "reject", token });
              }
            }
          }

          updateSlot(messageIndex, actionIndex, {
            state: decision === "accept" ? "accepted" : "rejected",
          });
          setMessages((current) => [
            ...current,
            {
              role: "assistant" as const,
              text: result.data.answer,
              sourceType: result.data.sourceType,
              sourceLabel: result.data.sourceLabel,
              sourceHref: result.data.sourceHref,
            },
          ]);

          if (decision === "accept") {
            router.refresh();
          }
        } catch {
          updateSlot(messageIndex, actionIndex, {
            state: "pending",
            error: "Couldn't reach Ask Sangam. Try again.",
          });
          if (decision === "accept") break;
        }
      }
    } finally {
      setPending(false);
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
                    {messages.map((message, index) => {
                      const pendingCount =
                        message.proposals?.filter((s) => s.state === "pending").length ?? 0;
                      const showBatch =
                        (message.proposals?.length ?? 0) > 1 && pendingCount > 0;

                      return (
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
                            {message.role === "assistant" &&
                              message.proposals?.map((slot, actionIndex) => (
                                <ToolProposalCard
                                  key={`${index}-${actionIndex}-${slot.action.toolName}`}
                                  toolName={slot.action.toolName}
                                  summary={slot.action.summary}
                                  argsPreview={slot.action.argsPreview}
                                  choices={slot.action.choices}
                                  choicePrompt={slot.action.choicePrompt}
                                  choiceGroups={slot.action.choiceGroups}
                                  selectedChoiceId={slot.selectedChoiceId}
                                  onSelectChoice={(choiceId) =>
                                    updateSlot(index, actionIndex, {
                                      selectedChoiceId: choiceId,
                                      error: null,
                                    })
                                  }
                                  selectedGroupChoices={slot.selectedGroupChoices}
                                  onSelectGroupChoice={(groupId, optionId) =>
                                    updateSlot(index, actionIndex, {
                                      selectedGroupChoices: {
                                        ...(slot.selectedGroupChoices ?? {}),
                                        [groupId]: optionId,
                                      },
                                      error: null,
                                    })
                                  }
                                  state={slot.state}
                                  error={slot.error}
                                  onAccept={() => void decide(index, actionIndex, "accept")}
                                  onReject={() => void decide(index, actionIndex, "reject")}
                                />
                              ))}
                            {showBatch && (
                              <div className="mt-2 space-y-2">
                                {message.batchError && (
                                  <p className="text-xs text-destructive">{message.batchError}</p>
                                )}
                                <div className="flex gap-2">
                                  <Btn
                                    type="button"
                                    size="sm"
                                    disabled={pending}
                                    onClick={() => void decideAllBatched(index, "accept")}
                                  >
                                    Accept all
                                  </Btn>
                                  <Btn
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={pending}
                                    onClick={() => void decideAllBatched(index, "reject")}
                                  >
                                    Reject all
                                  </Btn>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
