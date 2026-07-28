import type { Session } from "next-auth";
import { getPrimaryClubMembership, homePathForUser, accessibleAppRoles } from "@/backend/auth/roles";

const session = {
  user: {
    memberships: [
      { clubId: "c1", role: "Member" },
      { clubId: "c2", role: "Coordinator" },
      { clubId: "c3", role: "Volunteer" },
    ],
  },
} as unknown as Session;

describe("getPrimaryClubMembership", () => {
  it("returns the preferred role when available", () => {
    expect(getPrimaryClubMembership(session, "Coordinator")).toEqual({ clubId: "c2", role: "Coordinator" });
  });

  it("falls back to the first membership", () => {
    expect(getPrimaryClubMembership(session, "Admin")).toEqual({ clubId: "c1", role: "Member" });
    expect(getPrimaryClubMembership(session)).toEqual({ clubId: "c1", role: "Member" });
  });
});

describe("homePathForUser", () => {
  it("prefers faculty, then highest club role", () => {
    expect(homePathForUser({ isFaculty: true, memberships: [{ role: "Admin" }] })).toBe("/faculty");
    expect(homePathForUser({ memberships: [{ role: "Member" }, { role: "Admin" }] })).toBe("/admin");
    expect(homePathForUser({ memberships: [{ role: "Volunteer" }, { role: "Coordinator" }] })).toBe("/coordinator");
    expect(homePathForUser({ memberships: [{ role: "Volunteer" }] })).toBe("/volunteer");
    expect(homePathForUser({ memberships: [{ role: "Member" }] })).toBe("/app");
    expect(homePathForUser({ memberships: [] })).toBe("/app");
  });
});

describe("accessibleAppRoles", () => {
  it("lists only roles the user can open", () => {
    expect(
      accessibleAppRoles({
        isFaculty: true,
        memberships: [{ role: "Admin" }, { role: "Coordinator" }, { role: "Volunteer" }, { role: "Member" }],
      }),
    ).toEqual(["faculty", "admin", "coordinator", "volunteer", "member"]);

    expect(accessibleAppRoles({ memberships: [{ role: "Admin" }] })).toEqual(["admin", "member"]);
    expect(accessibleAppRoles({ isFaculty: true, memberships: [] })).toEqual(["faculty"]);
    expect(accessibleAppRoles({ memberships: [{ role: "Member" }] })).toEqual(["member"]);
  });
});
