import type { Session } from "next-auth";

export function getPrimaryClubMembership(session: Session, preferredRole?: string) {
  const memberships = session.user.memberships;
  if (preferredRole) {
    const match = memberships.find((m) => m.role === preferredRole);
    if (match) return match;
  }
  return memberships[0];
}
