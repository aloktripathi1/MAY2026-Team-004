export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const MEMBERSHIP_STATUSES = ["Pending", "Active", "Inactive"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const EVENT_APPROVALS = ["approved", "pending", "rejected"] as const;
export type EventApproval = (typeof EVENT_APPROVALS)[number];

export type EventCapacitySnapshot = {
  status: string;
  capacity: number;
  going?: number | null;
  rsvpCount: number;
};

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

export function decideRsvpAction(hasExistingRsvp: boolean, event: EventCapacitySnapshot | null | undefined): "register" | "cancel" {
  if (hasExistingRsvp) return "cancel";
  if (!event) throw new Error("Event not found");

  const spotsTaken = Math.max(Number(event.going ?? 0), event.rsvpCount);
  if (event.status === "past" || spotsTaken >= event.capacity) {
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
