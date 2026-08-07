import { SURFACE_ROLES, resolveSurfaceMembership } from "@/backend/auth/roles";

const codechefAdmin = { role: "Admin", clubId: "c1" };
const ecellCoordinator = { role: "Coordinator", clubId: "c6" };
const sargaVolunteer = { role: "Volunteer", clubId: "c3" };
const paradoxMember = { role: "Member", clubId: "c2" };

describe("SURFACE_ROLES", () => {
  /**
   * Seniority runs one way only. A Coordinator inheriting Admin surfaces would
   * hand them member management, approvals and club handover.
   */
  it("lets an Admin act on Coordinator surfaces but never the reverse", () => {
    expect(SURFACE_ROLES.Coordinator).toEqual(expect.arrayContaining(["Coordinator", "Admin"]));
    expect(SURFACE_ROLES.Admin).toEqual(["Admin"]);
    expect(SURFACE_ROLES.Admin).not.toContain("Coordinator");
  });
});

describe("resolveSurfaceMembership", () => {
  it("matches the exact role when the user holds it", () => {
    const found = resolveSurfaceMembership([codechefAdmin, ecellCoordinator], "Coordinator");
    expect(found).toBe(ecellCoordinator);
  });

  /**
   * The case that made a founded club unusable: its Admin is the only member,
   * can't appoint themselves Coordinator, and so could never open /coordinator
   * to create the club's first event.
   */
  it("falls back to Admin for a Coordinator surface", () => {
    expect(resolveSurfaceMembership([codechefAdmin], "Coordinator")).toBe(codechefAdmin);
  });

  it("prefers the exact match so the surface lands on the right club", () => {
    // Admin of c1 and Coordinator of c6 — the coordinator surface is about c6.
    const found = resolveSurfaceMembership([codechefAdmin, ecellCoordinator], "Coordinator");
    expect(found?.clubId).toBe("c6");
  });

  it("refuses to promote a Coordinator onto an Admin surface", () => {
    expect(resolveSurfaceMembership([ecellCoordinator], "Admin")).toBeUndefined();
  });

  it("refuses junior roles entirely", () => {
    expect(resolveSurfaceMembership([sargaVolunteer, paradoxMember], "Coordinator")).toBeUndefined();
    expect(resolveSurfaceMembership([sargaVolunteer, paradoxMember], "Admin")).toBeUndefined();
  });

  it("returns undefined with no memberships", () => {
    expect(resolveSurfaceMembership([], "Coordinator")).toBeUndefined();
    expect(resolveSurfaceMembership([], "Admin")).toBeUndefined();
  });

  it("treats an unknown surface as requiring that exact role", () => {
    expect(resolveSurfaceMembership([codechefAdmin], "Member")).toBeUndefined();
    expect(resolveSurfaceMembership([paradoxMember], "Member")).toBe(paradoxMember);
  });
});
