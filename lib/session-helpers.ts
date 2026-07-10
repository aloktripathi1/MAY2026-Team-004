import type { Session } from "next-auth";
import type { AppRole, RoleOption } from "@/components/shell/RoleSwitcher";

export function getPrimaryClubMembership(session: Session, preferredRole?: string) {
  const memberships = session.user.memberships;
  if (preferredRole) {
    const match = memberships.find((m) => m.role === preferredRole);
    if (match) return match;
  }
  return memberships[0];
}

const roleConfig: Record<AppRole, { label: string; href: string }> = {
  member: { label: "Member", href: "/app" },
  coordinator: { label: "Coordinator", href: "/coordinator" },
  admin: { label: "Club Admin", href: "/admin" },
  volunteer: { label: "Volunteer", href: "/volunteer" },
  faculty: { label: "Faculty Mentor", href: "/faculty" },
};

function normalizeRole(role: string): AppRole | null {
  if (role === "Member") return "member";
  if (role === "Coordinator") return "coordinator";
  if (role === "Admin") return "admin";
  if (role === "Volunteer") return "volunteer";
  return null;
}

export function getHeldRoleOptions(session: Session): RoleOption[] {
  const seen = new Set<AppRole>();
  const options: RoleOption[] = [];

  for (const membership of session.user.memberships) {
    const role = normalizeRole(membership.role);
    if (!role || seen.has(role)) continue;
    seen.add(role);
    options.push({
      role,
      label: roleConfig[role].label,
      href: roleConfig[role].href,
      context: membership.clubName,
    });
  }

  if (session.user.isFaculty && !seen.has("faculty")) {
    options.push({
      role: "faculty",
      label: roleConfig.faculty.label,
      href: roleConfig.faculty.href,
      context: "Faculty Mentor",
    });
  }

  return options;
}
