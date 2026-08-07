import type { SessionMembership } from "@/backend/auth/session-cookies";

export type AssistantSourceType = "event" | "task" | "announcement" | "membership";

export type ProposedActionStatus = "pending";

export type AssistantProposedChoice = {
  id: string;
  label: string;
  description?: string;
  /** Signed pending token for this specific choice — Accept uses this after selection. */
  token: string;
  argsPreview: Record<string, string>;
};

/** One dimension of a multi-select MCQ (e.g. audience + timing). */
export type AssistantProposedChoiceGroup = {
  id: string;
  prompt: string;
  options: Array<{
    id: string;
    label: string;
    description?: string;
  }>;
};

export type AssistantProposedAction = {
  toolName: string;
  summary: string;
  argsPreview: Record<string, string>;
  /**
   * Primary token when there is a single proposal.
   * When `choices` is set, Accept must use the selected choice's token instead;
   * this field may be empty.
   */
  token: string;
  status: ProposedActionStatus;
  /** When set, UI must pick one option before Accept (no chat follow-up). */
  choices?: AssistantProposedChoice[];
  /** Label above the choice list when there is a single group (e.g. "Select a task"). */
  choicePrompt?: string;
  /**
   * Multi-dimension MCQ (e.g. announcement audience + timing).
   * Selection ids join with `__` to match a row in `choices`.
   */
  choiceGroups?: AssistantProposedChoiceGroup[];
  /** Optional pre-selected option id per choice group (e.g. audience from the prompt). */
  defaultGroupSelections?: Record<string, string>;
};

export type AssistantAnswer = {
  answer: string;
  sourceType: AssistantSourceType | null;
  sourceLabel?: string;
  sourceHref?: string;
  /** Present when the write agent proposed a mutation that needs Accept/Reject. */
  proposedAction?: AssistantProposedAction;
};

export type AssistantSessionUser = {
  id: string;
  isFaculty: boolean;
  memberships: SessionMembership[];
};
