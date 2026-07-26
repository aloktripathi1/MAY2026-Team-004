import type { Session } from "next-auth";

export type AppRole = "member" | "coordinator" | "admin" | "volunteer" | "faculty";

export const APP_ROLE_HOME: Record<AppRole, string> = {
  member: "/app",
  coordinator: "/coordinator",
  admin: "/admin",
  volunteer: "/volunteer",
  faculty: "/faculty",
};

export function getPrimaryClubMembership(session: Session, preferredRole?: string) {
  const memberships = session.user.memberships;
  if (preferredRole) {
    const match = memberships.find((m) => m.role === preferredRole);
    if (match) return match;
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
