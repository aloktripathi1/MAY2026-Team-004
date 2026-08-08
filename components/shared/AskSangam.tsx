"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, X, ArrowUp, CalendarDays, ListChecks, Megaphone, Users2, Mic, SquareStop, Loader2 } from "lucide-react";
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
    "Which clubs am I a member of?",
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
    <span className="inline-flex max-w-full items-start gap-1.5 rounded-md bg-white/[0.06] px-2 py-1 font-mono text-[10px] font-semibold text-secondary ring-1 ring-secondary/25">
      <Icon className="mt-0.5 h-3 w-3 shrink-0" />
      <span className="min-w-0 uppercase tracking-[0.14em]">
        {meta.label}
        {sourceLabel && <span className="normal-case tracking-normal text-secondary/80"> · {sourceLabel}</span>}
      </span>
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
  const [voiceState, setVoiceState] = useState<"idle" | "recording" | "transcribing">("idle");
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelFrameRef = useRef<number | null>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  const hasOpenProposal = messages.some(
    (m) => m.proposedAction && (!m.proposalState || m.proposalState === "pending" || m.proposalState === "accepting" || m.proposalState === "rejecting"),
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    return () => {
      if (maxDurationTimeoutRef.current) clearTimeout(maxDurationTimeoutRef.current);
      stopLevelMeter();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
        recorder.stream.getTracks().forEach((track) => track.stop());
      }
    };
    // Cleanup only touches refs, so it only needs to run once on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const BAR_COUNT = 5;

  function resetBars() {
    for (const bar of barRefs.current) {
      if (bar) bar.style.transform = "scaleY(0.15)";
    }
  }

  function stopLevelMeter() {
    if (levelFrameRef.current) {
      cancelAnimationFrame(levelFrameRef.current);
      levelFrameRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    resetBars();
  }

  function startLevelMeter(stream: MediaStream) {
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextCtor();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const bucketSize = Math.max(1, Math.floor(data.length / BAR_COUNT));

    const tick = () => {
      const currentAnalyser = analyserRef.current;
      if (!currentAnalyser) return;
      currentAnalyser.getByteFrequencyData(data);
      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        for (let j = 0; j < bucketSize; j++) sum += data[i * bucketSize + j] ?? 0;
        const avg = sum / bucketSize / 255;
        const scale = Math.max(0.15, Math.min(1, avg * 1.8));
        const bar = barRefs.current[i];
        if (bar) bar.style.transform = `scaleY(${scale})`;
      }
      levelFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

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
        body: JSON.stringify({ query: text, role }),
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

  const MAX_RECORDING_MS = 60_000;

  async function startRecording() {
    if (voiceState !== "idle" || pending || hasOpenProposal) return;
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Couldn't access the microphone. Check your browser's permission for this site.");
      return;
    }

    const recorder = new MediaRecorder(stream);
    audioChunksRef.current = [];
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      stopLevelMeter();
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
        maxDurationTimeoutRef.current = null;
      }
      void transcribeRecording();
    };

    recorder.start();
    setVoiceState("recording");
    startLevelMeter(stream);
    maxDurationTimeoutRef.current = setTimeout(() => stopRecording(), MAX_RECORDING_MS);
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  async function transcribeRecording() {
    setVoiceState("transcribing");
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      audioChunksRef.current = [];

      if (audioBlob.size === 0) {
        setError("Didn't catch that — try recording again.");
        return;
      }

      const form = new FormData();
      form.append("audio", audioBlob, "clip.webm");

      const res = await fetch("/api/assistant/transcribe", { method: "POST", body: form });
      const body = await res.json();

      if (!res.ok || !body.success) {
        setError(body?.error?.message ?? "Couldn't transcribe that. Please try again.");
        return;
      }

      setInput((current) => (current.trim() ? `${current.trim()} ${body.data.text}` : body.data.text));
    } catch {
      setError("Couldn't reach the transcription service. Check your connection and try again.");
    } finally {
      setVoiceState("idle");
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
                className="shrink-0 border-t border-white/10 p-4"
              >
                <div className="flex items-center gap-1.5 rounded-2xl border border-white/[0.12] bg-white/[0.035] py-1.5 pl-3.5 pr-1.5 transition focus-within:border-secondary/55">
                  {voiceState === "recording" ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2.5 py-1">
                      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-destructive" />
                      <div className="flex h-4 flex-1 items-center gap-[3px]">
                        {Array.from({ length: BAR_COUNT }).map((_, i) => (
                          <div
                            key={i}
                            ref={(el) => {
                              barRefs.current[i] = el;
                            }}
                            className="h-full w-1 shrink-0 origin-center rounded-full bg-destructive/70"
                            style={{ transform: "scaleY(0.15)" }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={
                        hasOpenProposal
                          ? "Accept or reject the pending action…"
                          : voiceState === "transcribing"
                            ? "Transcribing…"
                            : "Ask Sangam anything…"
                      }
                      disabled={pending || hasOpenProposal || voiceState !== "idle"}
                      className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-white outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
                    />
                  )}
                  <button
                    type="button"
                    onClick={voiceState === "recording" ? stopRecording : startRecording}
                    disabled={pending || hasOpenProposal || voiceState === "transcribing"}
                    aria-label={voiceState === "recording" ? "Stop recording" : "Record voice message"}
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40",
                      voiceState === "recording"
                        ? "bg-destructive text-destructive-foreground"
                        : "text-muted-foreground hover:text-secondary",
                    )}
                  >
                    {voiceState === "recording" ? (
                      <SquareStop className="h-4 w-4" />
                    ) : voiceState === "transcribing" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="submit"
                    disabled={pending || hasOpenProposal || voiceState !== "idle" || !input.trim()}
                    aria-label="Send"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-muted-foreground"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
