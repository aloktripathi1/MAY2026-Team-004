export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const MEMBERSHIP_STATUSES = ["Pending", "Active", "Inactive"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const EVENT_APPROVALS = ["approved", "pending", "rejected"] as const;
export type EventApproval = (typeof EVENT_APPROVALS)[number];

/**
 * Approval states an event may be in and still be shown to members.
 *
 * `notRequired` is included: it means the event never needed faculty sign-off,
 * not that sign-off is outstanding. Most seeded events are in that state.
 *
 * `pending` and `rejected` are excluded. A pending event has not been cleared to
 * run, and registration is refused for it anyway (see decideCountMeInAction), so
 * listing it advertises something nobody can join. A rejected one may already
 * have had its registrants told it was cancelled.
 *
 * Coordinator, admin and faculty surfaces deliberately do *not* use this — they
 * exist to act on events awaiting approval.
 */
export const MEMBER_VISIBLE_APPROVALS = ["approved", "notRequired"] as const;

/**
 * Prisma `where` fragment for the rule above, so every surface filters alike.
 * A function rather than a shared constant: Prisma needs a mutable array, and a
 * fresh object per call can't be mutated by one query and surprise another.
 */
export function memberVisibleEventWhere() {
  return { approval: { in: [...MEMBER_VISIBLE_APPROVALS] } };
}

export function isApprovalVisibleToMembers(approval: string): boolean {
  return (MEMBER_VISIBLE_APPROVALS as readonly string[]).includes(approval);
}

export type EventCapacitySnapshot = {
  status: string;
  capacity: number;
  countMeInCount: number;
  date?: Date | string;
  approval: string;
};

/**
 * Whether an event should be treated as past. Checks the actual date rather
 * than trusting only the stored `status` field, which is set once and never
 * automatically transitions as real time passes (see issue #66).
 */
export function isEventPast(event: { status: string; date?: Date | string }): boolean {
  if (event.status === "past") return true;
  if (!event.date) return false;
  return new Date(event.date).getTime() < Date.now();
}

export function parseTagInput(tags: string | null | undefined): string[] {
  return (tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function buildEventSlug(title: string, nowMs = Date.now()): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base || "event"}-${nowMs.toString(36)}`;
}

export function decideJoinRequestAction(existingStatus: string | null | undefined): "create" | "withdraw" | "none" {
  if (existingStatus === "Pending") return "withdraw";
  if (existingStatus) return "none";
  return "create";
}

export function decideCountMeInAction(hasExistingCountMeIn: boolean, event: EventCapacitySnapshot | null | undefined): "register" | "cancel" {
  if (hasExistingCountMeIn) return "cancel";
  if (!event) throw new Error("Event not found");

  // "notRequired" events never go through faculty review, so they're
  // registerable from creation; "pending"/"rejected" are not (#119).
  if (event.approval !== "approved" && event.approval !== "notRequired") {
    throw new Error("Registration opens once this event is approved.");
  }

  if (isEventPast(event) || event.countMeInCount >= event.capacity) {
    throw new Error("Registration unavailable");
  }

  return "register";
}

export function normalizeTaskStatus(status: string): TaskStatus {
  if ((TASK_STATUSES as readonly string[]).includes(status)) return status as TaskStatus;
  throw new Error("Invalid task status");
}

export function normalizeMembershipStatus(status: string): MembershipStatus {
  if ((MEMBERSHIP_STATUSES as readonly string[]).includes(status)) return status as MembershipStatus;
  throw new Error("Invalid membership status");
}

export function normalizeEventApproval(approval: string): EventApproval {
  if ((EVENT_APPROVALS as readonly string[]).includes(approval)) return approval as EventApproval;
  throw new Error("Invalid approval status");
}

export function requireClubAdminAccess(
  memberships: Array<{ clubId: string; role: string }>,
  clubId: string,
): void {
  const isAdmin = memberships.some((membership) => membership.clubId === clubId && membership.role === "Admin");
  if (!isAdmin) throw new Error("Not authorized for this club");
}

export function requireFacultyAccess(isFaculty: boolean): void {
  if (!isFaculty) throw new Error("Faculty only");
}
