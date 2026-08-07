import type { Session } from "next-auth";

export type AppRole = "member" | "coordinator" | "admin" | "volunteer" | "faculty";

export const APP_ROLE_HOME: Record<AppRole, string> = {
  member: "/app",
  coordinator: "/coordinator",
  admin: "/admin",
  volunteer: "/volunteer",
  faculty: "/faculty",
};

/**
 * Which club roles may act on a given role's surface.
 *
 * An Admin outranks a Coordinator, and the domain layer has always agreed —
 * `requireCoordinatorForClub` (domain/events.ts) and `canManageClub`
 * (domain/tasks.ts) both accept Coordinator *or* Admin. The pages and Server
 * Actions did not, so a club Admin could create an event through
 * POST /api/events yet be redirected away from /coordinator and refused by
 * createEventAction.
 *
 * Harmless while every club came from the seed with both an Admin and
 * Coordinators. It breaks the moment a club is founded through a club request:
 * its Admin is the only member, cannot appoint themselves Coordinator (one
 * membership per user per club), and so could never create the club's first
 * event or assign its first task from the interface.
 *
 * Admin surfaces stay Admin-only — a Coordinator must never inherit upward.
 */
export const SURFACE_ROLES: Record<string, string[]> = {
  Coordinator: ["Coordinator", "Admin"],
  Admin: ["Admin"],
};

/**
 * Finds the membership that lets this user act on `role`'s surface. Prefers an
 * exact role match, so someone who is Coordinator of one club and Admin of
 * another lands on the club the surface is actually about.
 */
export function resolveSurfaceMembership<T extends { role: string }>(
  memberships: T[],
  role: string,
): T | undefined {
  const exact = memberships.find((m) => m.role === role);
  if (exact) return exact;

  const allowed = SURFACE_ROLES[role] ?? [role];
  return memberships.find((m) => allowed.includes(m.role));
}

/**
 * Returns the caller's membership for `preferredRole`'s surface, or `undefined`
 * if they hold no role that qualifies — callers rely on `undefined` to reject
 * the request. Role seniority is honoured per SURFACE_ROLES above; it never
 * substitutes an unrelated, junior membership.
 */
export function getPrimaryClubMembership(session: Session, preferredRole?: string) {
  const memberships = session.user.memberships;
  if (preferredRole) {
    return resolveSurfaceMembership(memberships, preferredRole);
  }
  return memberships[0];
}

/** Default post-login home. Highest role wins when the user has several clubs/roles. */
export function homePathForUser(user: {
  isFaculty?: boolean;
  memberships: Array<{ role: string }>;
}): string {
  if (user.isFaculty) return "/faculty";

  const roles = new Set(user.memberships.map((m) => m.role));
  if (roles.has("Admin")) return "/admin";
  if (roles.has("Coordinator")) return "/coordinator";
  if (roles.has("Volunteer")) return "/volunteer";
  return "/app";
}

const APP_ROLE_TO_CLUB_ROLE: Record<Exclude<AppRole, "faculty">, string> = {
  member: "Member",
  coordinator: "Coordinator",
  admin: "Admin",
  volunteer: "Volunteer",
};

/**
 * Memberships that back a specific shell. A coordinator browsing the member
 * app is acting as a member there, so capabilities scoped by this function
 * don't leak across shells.
 */
export function membershipsForAppRole<T extends { role: string }>(memberships: T[], role: AppRole): T[] {
  if (role === "faculty") return [];
  const clubRole = APP_ROLE_TO_CLUB_ROLE[role];
  return memberships.filter((m) => m.role === clubRole);
}

/** Roles the user can open in the shell switcher (multi-club / multi-role safe). */
export function accessibleAppRoles(user: {
  isFaculty?: boolean;
  memberships: Array<{ role: string }>;
}): AppRole[] {
  const roles: AppRole[] = [];
  const clubRoles = new Set(user.memberships.map((m) => m.role));

  if (user.isFaculty) roles.push("faculty");
  if (clubRoles.has("Admin")) roles.push("admin");
  if (clubRoles.has("Coordinator")) roles.push("coordinator");
  if (clubRoles.has("Volunteer")) roles.push("volunteer");
  // Member app is available to anyone with a club membership (incl. Admin-only).
  if (clubRoles.has("Member") || user.memberships.length > 0) roles.push("member");

  return roles;
}
