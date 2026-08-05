"use client";

import { Btn, StatusPill } from "@/components/ui/primitives";

export type ProposalCardState = "pending" | "accepting" | "rejecting" | "accepted" | "rejected";

export type ToolProposalCardProps = {
  toolName: string;
  summary: string;
  argsPreview: Record<string, string>;
  state: ProposalCardState;
  error?: string | null;
  onAccept: () => void;
  onReject: () => void;
};

export function ToolProposalCard({
  toolName,
  summary,
  argsPreview,
  state,
  error,
  onAccept,
  onReject,
}: ToolProposalCardProps) {
  const busy = state === "accepting" || state === "rejecting";
  const decided = state === "accepted" || state === "rejected";

  return (
    <div className="night-panel mt-2 rounded-xl p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-mono-label text-secondary">{toolName.replaceAll("_", " ")}</p>
        <StatusPill tone={state === "accepted" ? "green" : state === "rejected" ? "slate" : "amber"}>
          {state === "accepted" ? "Done" : state === "rejected" ? "Rejected" : "Pending"}
        </StatusPill>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/[0.9]">{summary}</p>
      {Object.keys(argsPreview).length > 0 && (
        <dl className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
          {Object.entries(argsPreview).map(([key, value]) => (
            <div key={key} className="flex gap-2 text-xs">
              <dt className="shrink-0 font-mono uppercase tracking-[0.12em] text-muted-foreground">{key}</dt>
              <dd className="min-w-0 break-all text-white/80">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {!decided && (
        <div className="mt-3 flex gap-2">
          <Btn type="button" variant="primary" size="sm" disabled={busy} onClick={onAccept}>
            {state === "accepting" ? "Applying…" : "Accept"}
          </Btn>
          <Btn type="button" variant="outline" size="sm" disabled={busy} onClick={onReject}>
            {state === "rejecting" ? "Rejecting…" : "Reject"}
          </Btn>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
