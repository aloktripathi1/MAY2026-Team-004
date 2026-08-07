import {
  clearConsumedPendingActionsForTests,
  signPendingAction,
  verifyPendingAction,
} from "@/backend/assistant/agent/pending-action";
import { buildWriteProposal, toToolActor } from "@/backend/assistant/agent/run-write-agent";
import {
  canonicalizeAssistantPayload,
  signAssistantRequestBody,
  verifyAssistantRequestBody,
} from "@/backend/assistant/security/request-signing";
import {
  getTool,
  listRegisteredTools,
  previewToolCall,
  toAnthropicTools,
  toolsForActor,
} from "@/backend/assistant/tools/registry";
import type { ToolActor } from "@/backend/assistant/tools/types";
import { BULK_ASSIGN_MAX_ROWS } from "@/backend/domain/tasks";

const volunteerActor: ToolActor = {
  id: "user-volunteer",
  isFaculty: false,
  memberships: [
    {
      clubId: "c1",
      clubSlug: "paradox",
      clubName: "Paradox",
      role: "Volunteer",
      personaName: "Volunteer",
    },
  ],
};

const memberActor: ToolActor = {
  id: "user-member",
  isFaculty: false,
  memberships: [
    {
      clubId: "c2",
      clubSlug: "paradox",
      clubName: "Paradox",
      role: "Member",
      personaName: "Member",
    },
  ],
};

const coordinatorActor: ToolActor = {
  id: "user-coord",
  isFaculty: false,
  memberships: [
    {
      clubId: "c1",
      clubSlug: "paradox",
      clubName: "Paradox",
      role: "Coordinator",
      personaName: "Coordinator",
    },
  ],
};

const adminActor: ToolActor = {
  id: "user-admin",
  isFaculty: false,
  memberships: [
    {
      clubId: "c1",
      clubSlug: "codechef",
      clubName: "CodeChef",
      role: "Admin",
      personaName: "Admin",
    },
  ],
};

beforeEach(() => {
  clearConsumedPendingActionsForTests();
});

describe("assistant tool registry", () => {
  it("registers single-task, bulk assign, and announcement tools", () => {
    const names = listRegisteredTools()
      .map((t) => t.name)
      .sort();
    expect(names).toEqual([
      "assign_task",
      "list_club_events",
      "list_club_volunteers",
      "list_my_tasks",
      "offer_task_status_choices",
      "propose_announcement",
      "propose_bulk_task_assignments",
      "resolve_club_members_by_name",
      "resolve_members_by_name",
      "update_task_status",
    ]);
  });

  it("offers bulk tools to coordinators and announcement tools to admins", () => {
    const coordinatorNames = toolsForActor(coordinatorActor).map((t) => t.name);
    const adminNames = toolsForActor(adminActor).map((t) => t.name);

    expect(coordinatorNames).toContain("propose_bulk_task_assignments");
    expect(coordinatorNames).toContain("assign_task");
    expect(coordinatorNames).toContain("update_task_status");
    expect(coordinatorNames).toContain("list_club_events");
    expect(coordinatorNames).not.toContain("propose_announcement");

    expect(adminNames).toContain("propose_announcement");
    expect(adminNames).toContain("resolve_club_members_by_name");
    expect(adminNames).not.toContain("assign_task");
    expect(adminNames).not.toContain("update_task_status");
    expect(adminNames).not.toContain("list_my_tasks");
    expect(adminNames).not.toContain("list_club_events");
    expect(adminNames).not.toContain("propose_bulk_task_assignments");
  });

  it("offers status tools to volunteers but not assign/bulk/announce", () => {
    const volunteerNames = toolsForActor(volunteerActor).map((t) => t.name);
    expect(volunteerNames).toContain("list_my_tasks");
    expect(volunteerNames).toContain("update_task_status");
    expect(volunteerNames).toContain("offer_task_status_choices");
    expect(volunteerNames).not.toContain("assign_task");
    expect(volunteerNames).not.toContain("list_club_events");
    expect(volunteerNames).not.toContain("propose_bulk_task_assignments");
    expect(volunteerNames).not.toContain("propose_announcement");
    expect(toolsForActor(memberActor)).toEqual([]);
  });

  it("offers no write tools to faculty", () => {
    const facultyActor: ToolActor = {
      id: "user-faculty",
      isFaculty: true,
      memberships: [],
    };
    expect(toolsForActor(facultyActor)).toEqual([]);
  });

  it("role matrix: write tools match shell capabilities", () => {
    const byRole = {
      volunteer: new Set(toolsForActor(volunteerActor).map((t) => t.name)),
      coordinator: new Set(toolsForActor(coordinatorActor).map((t) => t.name)),
      admin: new Set(toolsForActor(adminActor).map((t) => t.name)),
      member: new Set(toolsForActor(memberActor).map((t) => t.name)),
    };

    // Status
    expect(byRole.volunteer.has("update_task_status")).toBe(true);
    expect(byRole.coordinator.has("update_task_status")).toBe(true);
    expect(byRole.admin.has("update_task_status")).toBe(false);
    expect(byRole.member.has("update_task_status")).toBe(false);

    // Single + bulk assign — coordinator only (not volunteer)
    expect(byRole.volunteer.has("assign_task")).toBe(false);
    expect(byRole.volunteer.has("propose_bulk_task_assignments")).toBe(false);
    expect(byRole.coordinator.has("assign_task")).toBe(true);
    expect(byRole.coordinator.has("propose_bulk_task_assignments")).toBe(true);
    expect(byRole.admin.has("assign_task")).toBe(false);
    expect(byRole.admin.has("propose_bulk_task_assignments")).toBe(false);

    // Announcements — admin only
    expect(byRole.admin.has("propose_announcement")).toBe(true);
    expect(byRole.admin.has("resolve_club_members_by_name")).toBe(true);
    expect(byRole.volunteer.has("propose_announcement")).toBe(false);
    expect(byRole.coordinator.has("propose_announcement")).toBe(false);
    expect(byRole.coordinator.has("resolve_club_members_by_name")).toBe(false);
  });

  it("hides coordinator tools when the same user is in the member shell", () => {
    const sessionUser = {
      id: coordinatorActor.id,
      isFaculty: false,
      memberships: coordinatorActor.memberships,
    };
    expect(toolsForActor(toToolActor(sessionUser, "coordinator")).map((t) => t.name)).toContain(
      "propose_bulk_task_assignments",
    );
    expect(toolsForActor(toToolActor(sessionUser, "member"))).toEqual([]);
  });

  it("marks write tools as requiring confirmation", () => {
    expect(getTool("list_club_events")?.requiresConfirmation).toBe(false);
    expect(getTool("list_my_tasks")?.requiresConfirmation).toBe(false);
    expect(getTool("update_task_status")?.requiresConfirmation).toBe(true);
    expect(getTool("offer_task_status_choices")?.requiresConfirmation).toBe(true);
    expect(getTool("assign_task")?.requiresConfirmation).toBe(true);
    expect(getTool("propose_bulk_task_assignments")?.requiresConfirmation).toBe(true);
    expect(getTool("propose_announcement")?.requiresConfirmation).toBe(true);
  });

  it("previews bulk assign without executing", () => {
    const preview = previewToolCall("propose_bulk_task_assignments", coordinatorActor, {
      assignments: [
        {
          title: "Poster",
          role: "Design",
          eventId: "evt_1",
          assigneeId: "u_a",
          assigneeName: "Arjun",
          eventTitle: "TechFest",
        },
      ],
    });
    expect(preview.argsPreview.count).toBe("1");
    expect(preview.summary).toMatch(/1 task/i);
  });

  it("rejects bulk assign over the max row cap at preview time", () => {
    const assignments = Array.from({ length: BULK_ASSIGN_MAX_ROWS + 1 }, (_, i) => ({
      title: `Task ${i}`,
      role: "Crew",
      eventId: "evt_1",
      assigneeId: `u_${i}`,
    }));
    expect(() => previewToolCall("propose_bulk_task_assignments", coordinatorActor, { assignments })).toThrow();
  });

  it("rejects announcement preview for coordinators", () => {
    expect(() =>
      previewToolCall("propose_announcement", coordinatorActor, {
        title: "Hello",
        body: "World",
      }),
    ).toThrow(/not available/i);
  });

  it("previews targeted announcements with recipient names", () => {
    const preview = previewToolCall("propose_announcement", adminActor, {
      title: "Laptop check",
      body: "Bring your laptop",
      recipientUserIds: ["u_soham"],
      recipientNames: ["Soham Reddy"],
    });
    expect(preview.argsPreview.to).toBe("Soham Reddy");
    expect(preview.summary).toMatch(/Soham Reddy/);
  });

  it("maps available tools to Anthropic tool definitions", () => {
    const tools = toAnthropicTools(coordinatorActor);
    expect(tools.every((t) => t.name && t.input_schema?.type === "object")).toBe(true);
  });
});

describe("buildWriteProposal announcement choices", () => {
  it("builds audience × timing choices for role-audience drafts", async () => {
    const result = await buildWriteProposal(
      adminActor,
      "propose_announcement",
      { title: "Hello", body: "World", audience: "Volunteers" },
      "admin",
    );
    expect(result.proposedAction?.choices).toHaveLength(6);
    expect(result.proposedAction?.choices?.map((c) => c.id)).toEqual(
      expect.arrayContaining(["All__digest", "Volunteers__send_now", "Coordinators__digest"]),
    );
    expect(result.proposedAction?.defaultGroupSelections?.audience).toBe("Volunteers");
  });

  it("builds specific__ timing choices when recipientUserIds are set", async () => {
    const result = await buildWriteProposal(
      adminActor,
      "propose_announcement",
      {
        title: "Targeted",
        body: "Just for you",
        recipientUserIds: ["u_soham"],
        recipientNames: ["Soham Reddy"],
      },
      "admin",
    );
    expect(result.proposedAction?.choices?.map((c) => c.id).sort()).toEqual([
      "specific__digest",
      "specific__send_now",
    ]);
    expect(result.proposedAction?.argsPreview.to).toBe("Soham Reddy");
    expect(result.proposedAction?.choiceGroups?.find((g) => g.id === "audience")?.options).toHaveLength(1);

    const digest = result.proposedAction!.choices!.find((c) => c.id === "specific__digest");
    const verified = verifyPendingAction(digest!.token, { expectedUserId: adminActor.id });
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.payload.args).toMatchObject({
        title: "Targeted",
        recipientUserIds: ["u_soham"],
        priority: "Med",
      });
    }
  });

  it("builds task status choice cards for offer_task_status_choices", async () => {
    const result = await buildWriteProposal(
      volunteerActor,
      "offer_task_status_choices",
      {
        status: "doing",
        options: [
          { taskId: "t1", title: "Booth setup", eventTitle: "Fest", assigneeName: "Vol" },
          { taskId: "t2", title: "Booth setup", eventTitle: "Fest", assigneeName: "Vol" },
        ],
      },
      "volunteer",
    );
    expect(result.proposedAction?.choices).toHaveLength(2);
    expect(result.proposedAction?.token).toBe("");
    expect(result.proposedAction?.choices?.[0]?.token).toMatch(/\./);
  });
});

describe("pending action tokens", () => {
  it("round-trips a signed payload for the same user", () => {
    const token = signPendingAction({
      userId: "user-a",
      toolName: "propose_bulk_task_assignments",
      args: { assignments: [] },
      role: "coordinator",
    });
    const verified = verifyPendingAction(token, { expectedUserId: "user-a" });
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.payload.toolName).toBe("propose_bulk_task_assignments");
      expect(verified.payload.role).toBe("coordinator");
      expect(verified.payload.jti).toBeTruthy();
    }
  });

  it("rejects a forged signature", () => {
    const token = signPendingAction({
      userId: "user-a",
      toolName: "propose_announcement",
      args: { title: "t", body: "b" },
    });
    const forged = `${token.slice(0, -4)}aaaa`;
    expect(verifyPendingAction(forged, { expectedUserId: "user-a" })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("rejects a user mismatch", () => {
    const token = signPendingAction({
      userId: "user-a",
      toolName: "propose_announcement",
      args: { title: "t", body: "b" },
    });
    expect(verifyPendingAction(token, { expectedUserId: "user-b" })).toEqual({
      ok: false,
      reason: "user_mismatch",
    });
  });

  it("rejects an expired token", () => {
    const token = signPendingAction(
      {
        userId: "user-a",
        toolName: "propose_announcement",
        args: { title: "t", body: "b" },
      },
      -1_000,
    );
    expect(verifyPendingAction(token, { expectedUserId: "user-a" })).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("rejects a consumed token on second use", () => {
    const token = signPendingAction({
      userId: "user-a",
      toolName: "propose_announcement",
      args: { title: "t", body: "b" },
    });
    expect(verifyPendingAction(token, { expectedUserId: "user-a", consume: true }).ok).toBe(true);
    expect(verifyPendingAction(token, { expectedUserId: "user-a", consume: true })).toEqual({
      ok: false,
      reason: "consumed",
    });
  });
});

describe("assistant request signing", () => {
  it("round-trips a signed request envelope", () => {
    const body = canonicalizeAssistantPayload({ kind: "query", userId: "u1", query: "hi", role: "admin" });
    const envelope = signAssistantRequestBody(body);
    const verified = verifyAssistantRequestBody(envelope);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.payload).toEqual({ kind: "query", userId: "u1", query: "hi", role: "admin" });
    }
  });

  it("rejects a tampered signature", () => {
    const body = canonicalizeAssistantPayload({ kind: "confirm", userId: "u1", decision: "accept", token: "x" });
    const envelope = signAssistantRequestBody(body);
    expect(verifyAssistantRequestBody({ body: envelope.body, signature: "not-real" }).ok).toBe(false);
  });
});
