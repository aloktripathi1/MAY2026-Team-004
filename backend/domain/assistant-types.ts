import type { SessionMembership } from "@/backend/auth/session-cookies";

export type AssistantSourceType = "event" | "task" | "announcement" | "membership";

export type ProposedActionStatus = "pending";

export type AssistantProposedAction = {
  toolName: string;
  summary: string;
  argsPreview: Record<string, string>;
  token: string;
  status: ProposedActionStatus;
};

export type AssistantAnswer = {
  answer: string;
  sourceType: AssistantSourceType | null;
  sourceLabel?: string;
  sourceHref?: string;
  /** Present when the task agent proposed a write that needs Accept/Reject. */
  proposedAction?: AssistantProposedAction;
};

export type AssistantSessionUser = {
  id: string;
  isFaculty: boolean;
  memberships: SessionMembership[];
};
