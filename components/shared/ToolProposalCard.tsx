"use client";

import { Btn, StatusPill } from "@/components/ui/primitives";
import type {
  AssistantProposedChoice,
  AssistantProposedChoiceGroup,
} from "@/backend/domain/assistant-types";
import { cn } from "@/lib/utils";

export type ProposalCardState = "pending" | "accepting" | "rejecting" | "accepted" | "rejected";

export type ToolProposalCardProps = {
  toolName: string;
  summary: string;
  argsPreview: Record<string, string>;
  choices?: AssistantProposedChoice[];
  choicePrompt?: string;
  choiceGroups?: AssistantProposedChoiceGroup[];
  /** Single-list selection (task ambiguity). */
  selectedChoiceId?: string | null;
  onSelectChoice?: (choiceId: string) => void;
  /** Multi-group selection (announcement audience × timing). */
  selectedGroupChoices?: Record<string, string>;
  onSelectGroupChoice?: (groupId: string, optionId: string) => void;
  state: ProposalCardState;
  error?: string | null;
  onAccept: () => void;
  onReject: () => void;
};

function resolveCompositeChoiceId(
  choiceGroups: AssistantProposedChoiceGroup[] | undefined,
  selectedGroupChoices: Record<string, string> | undefined,
): string | null {
  if (!choiceGroups?.length || !selectedGroupChoices) return null;
  const parts: string[] = [];
  for (const group of choiceGroups) {
    const selected = selectedGroupChoices[group.id];
    if (!selected) return null;
    parts.push(selected);
  }
  return parts.join("__");
}

export function ToolProposalCard({
  toolName,
  summary,
  argsPreview,
  choices,
  choicePrompt = "Select an option",
  choiceGroups,
  selectedChoiceId,
  onSelectChoice,
  selectedGroupChoices,
  onSelectGroupChoice,
  state,
  error,
  onAccept,
  onReject,
}: ToolProposalCardProps) {
  const busy = state === "accepting" || state === "rejecting";
  const decided = state === "accepted" || state === "rejected";
  const multiGroup = Boolean(choiceGroups && choiceGroups.length > 0);
  const needsChoice = Boolean(choices && choices.length > 0);

  const compositeId = multiGroup
    ? resolveCompositeChoiceId(choiceGroups, selectedGroupChoices)
    : selectedChoiceId ?? null;

  const selected = choices?.find((c) => c.id === compositeId);
  const preview = selected?.argsPreview ?? argsPreview;
  const acceptDisabled = busy || (needsChoice && !compositeId);

  return (
    <div className="night-panel mt-2 rounded-xl p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-mono-label text-secondary">{toolName.replaceAll("_", " ")}</p>
        <StatusPill tone={state === "accepted" ? "green" : state === "rejected" ? "slate" : "amber"}>
          {state === "accepted" ? "Done" : state === "rejected" ? "Rejected" : "Pending"}
        </StatusPill>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/[0.9]">{summary}</p>

      {needsChoice && !decided && multiGroup && (
        <div className="mt-3 space-y-4 border-t border-white/10 pt-3">
          {choiceGroups!.map((group) => (
            <div key={group.id} className="space-y-2">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.prompt}
              </p>
              {group.options.map((option) => {
                const isSelected = selectedGroupChoices?.[group.id] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={busy}
                    onClick={() => onSelectGroupChoice?.(group.id, option.id)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left transition",
                      isSelected
                        ? "border-secondary/50 bg-secondary/[0.12] ring-1 ring-secondary/35"
                        : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]",
                    )}
                  >
                    <div className="text-sm font-medium text-white/[0.92]">{option.label}</div>
                    {option.description && (
                      <div className="mt-0.5 text-xs text-muted-foreground">{option.description}</div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {needsChoice && !decided && !multiGroup && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {choicePrompt}
          </p>
          {choices!.map((choice) => {
            const isSelected = choice.id === selectedChoiceId;
            return (
              <button
                key={choice.id}
                type="button"
                disabled={busy}
                onClick={() => onSelectChoice?.(choice.id)}
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-left transition",
                  isSelected
                    ? "border-secondary/50 bg-secondary/[0.12] ring-1 ring-secondary/35"
                    : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]",
                )}
              >
                <div className="text-sm font-medium text-white/[0.92]">{choice.label}</div>
                {choice.description && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{choice.description}</div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {Object.keys(preview).length > 0 && (
        <dl className="mt-3 space-y-2.5 border-t border-white/10 pt-3">
          {Object.entries(preview).map(([key, value]) => {
            const lines = value.split("\n").filter(Boolean);
            const isMultiline = lines.length > 1;

            if (isMultiline) {
              return (
                <div key={key} className="space-y-1.5 text-xs">
                  <dt className="font-mono uppercase tracking-[0.12em] text-muted-foreground">{key}</dt>
                  <dd className="space-y-1">
                    {lines.map((line, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-white/80"
                      >
                        {line}
                      </div>
                    ))}
                  </dd>
                </div>
              );
            }

            return (
              <div key={key} className="flex gap-2 text-xs">
                <dt className="shrink-0 font-mono uppercase tracking-[0.12em] text-muted-foreground">{key}</dt>
                <dd className="min-w-0 whitespace-pre-wrap break-all text-white/80">{value}</dd>
              </div>
            );
          })}
        </dl>
      )}
      {!decided && (
        <div className="mt-3 flex gap-2">
          <Btn type="button" variant="primary" size="sm" disabled={acceptDisabled} onClick={onAccept}>
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
