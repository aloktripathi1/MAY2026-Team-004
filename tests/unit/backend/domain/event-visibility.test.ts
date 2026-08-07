import {
  MEMBER_VISIBLE_APPROVALS,
  isApprovalVisibleToMembers,
  memberVisibleEventWhere,
} from "@/backend/domain/workflow-rules";

describe("member event visibility", () => {
  /**
   * `notRequired` means the event never needed faculty sign-off, not that
   * sign-off is outstanding — most seeded events are in that state, so excluding
   * it would empty the events page.
   */
  it("shows approved and notRequired, hides pending and rejected", () => {
    expect(isApprovalVisibleToMembers("approved")).toBe(true);
    expect(isApprovalVisibleToMembers("notRequired")).toBe(true);
    expect(isApprovalVisibleToMembers("pending")).toBe(false);
    expect(isApprovalVisibleToMembers("rejected")).toBe(false);
  });

  it("ignores unknown values rather than defaulting them visible", () => {
    expect(isApprovalVisibleToMembers("")).toBe(false);
    expect(isApprovalVisibleToMembers("Approved")).toBe(false); // enum is lowercase
    expect(isApprovalVisibleToMembers("whatever")).toBe(false);
  });

  it("builds a Prisma filter matching the same set", () => {
    expect(memberVisibleEventWhere()).toEqual({ approval: { in: ["approved", "notRequired"] } });
  });

  // Prisma rejects a readonly array, and a shared object could be mutated by one
  // query and surprise the next — hence a function returning a fresh one.
  it("returns a fresh, mutable filter each call", () => {
    const a = memberVisibleEventWhere();
    const b = memberVisibleEventWhere();
    expect(a).not.toBe(b);
    expect(a.approval.in).not.toBe(MEMBER_VISIBLE_APPROVALS);
    a.approval.in.push("pending");
    expect(memberVisibleEventWhere().approval.in).toEqual(["approved", "notRequired"]);
  });
});
