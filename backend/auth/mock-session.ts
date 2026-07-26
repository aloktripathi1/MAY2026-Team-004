import { getAuthCookieUser, type SessionMembership } from "@/backend/auth/session-cookies";

export type { SessionMembership };

// The demo account (id "u1") holds all four club roles at once so QA can switch
// personas without logging in as different people. Each role still displays as
// a distinct, real seed member so the sidebar doesn't show "Ananya Rao" for
// every persona — the underlying session id/data-ownership stays the same
// (see the comment on `id` below), only the displayed name differs per role.
const memberships: SessionMembership[] = [
  { clubId: "c1", clubSlug: "codechef", clubName: "CodeChef IITM BS", role: "Admin", personaName: "Ananya Rao" },
  { clubId: "c6", clubSlug: "e-cell", clubName: "E-Cell IITM BS", role: "Coordinator", personaName: "Kabir Menon" },
  { clubId: "c3", clubSlug: "sarga", clubName: "Sarga - Music Circle", role: "Volunteer", personaName: "Ishita Deshpande" },
  { clubId: "c2", clubSlug: "paradox", clubName: "Paradox - Debate Society", role: "Member", personaName: "Ananya Rao" },
];

export function getMockSession() {
  const authUser = getAuthCookieUser();

  if (authUser) {
    return {
      user: {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        isFaculty: authUser.isFaculty ?? false,
        memberships: (authUser.memberships ?? []).map((m) => ({
          ...m,
          personaName: m.personaName || authUser.name,
        })),
      },
      expires: "2099-12-31T23:59:59.999Z",
    };
  }

  return {
    user: {
      // Must match the demo user id from prisma seed (member "m1" -> "u1").
      id: "u1",
      name: "Ananya Rao",
      email: "23s1000123@ds.study.iitm.ac.in",
      isFaculty: true,
      memberships,
    },
    expires: "2099-12-31T23:59:59.999Z",
  };
}
