export type SessionMembership = { clubId: string; clubSlug: string; clubName: string; role: string };

const memberships: SessionMembership[] = [
  { clubId: "c1", clubSlug: "codechef", clubName: "CodeChef IITM BS", role: "Admin" },
  { clubId: "c6", clubSlug: "e-cell", clubName: "E-Cell IITM BS", role: "Coordinator" },
  { clubId: "c3", clubSlug: "sarga", clubName: "Sarga - Music Circle", role: "Volunteer" },
  { clubId: "c2", clubSlug: "paradox", clubName: "Paradox - Debate Society", role: "Member" },
];

export function getMockSession() {
  return {
    user: {
      // Must match the demo user's real id in lib/prisma.ts's derived `users`
      // array (seed member "m1" Ananya Rao -> "u1"), since every "You"-owned
      // seed record (issues, tasks, rsvps) resolves to that id. A mismatched
      // id here means every "my issues" / "my tasks" / "have I RSVP'd" lookup
      // silently matches nothing.
      id: "u1",
      name: "Ananya Rao",
      email: "23s1000123@ds.study.iitm.ac.in",
      isFaculty: true,
      memberships,
    },
    expires: "2099-12-31T23:59:59.999Z",
  };
}
