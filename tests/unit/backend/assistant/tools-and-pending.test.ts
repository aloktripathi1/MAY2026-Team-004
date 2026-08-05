import {
  clearConsumedPendingActionsForTests,
  signPendingAction,
  verifyPendingAction,
} from "@/backend/assistant/agent/pending-action";
import {
  getTool,
  listRegisteredTools,
  previewToolCall,
  toAnthropicTools,
  toolsForActor,
} from "@/backend/assistant/tools/registry";
import type { ToolActor } from "@/backend/assistant/tools/types";
import { toToolActor } from "@/backend/assistant/agent/run-task-agent";

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

beforeEach(() => {
  clearConsumedPendingActionsForTests();
});

describe("assistant tool registry", () => {
  it("registers the three v1 task tools", () => {
    const names = listRegisteredTools().map((t) => t.name).sort();
    expect(names).toEqual(["assign_task", "list_my_tasks", "update_task_status"]);
  });

  it("hides assign_task from volunteers but shows it to coordinators", () => {
    const volunteerNames = toolsForActor(volunteerActor).map((t) => t.name);
    const coordinatorNames = toolsForActor(coordinatorActor).map((t) => t.name);

    expect(volunteerNames).toContain("list_my_tasks");
    expect(volunteerNames).toContain("update_task_status");
    expect(volunteerNames).not.toContain("assign_task");

    expect(coordinatorNames).toContain("assign_task");
  });

  it("offers no task tools to a plain member", () => {
    expect(toolsForActor(memberActor)).toEqual([]);
    expect(toAnthropicTools(memberActor)).toEqual([]);
  });

  it("blocks a plain member from previewing a task status change", () => {
    expect(() =>
      previewToolCall("update_task_status", memberActor, { taskId: "task_123", status: "done" }),
    ).toThrow(/not available/i);
  });

  it("gives a coordinator no task tools while they're in the member shell", () => {
    const sessionUser = { id: coordinatorActor.id, isFaculty: false, memberships: coordinatorActor.memberships };

    expect(toolsForActor(toToolActor(sessionUser, "coordinator")).map((t) => t.name)).toContain("assign_task");
    expect(toolsForActor(toToolActor(sessionUser, "member"))).toEqual([]);
  });

  it("maps available tools to Anthropic tool definitions", () => {
    const tools = toAnthropicTools(volunteerActor);
    expect(tools.every((t) => t.name && t.input_schema?.type === "object")).toBe(true);
    expect(tools.find((t) => t.name === "assign_task")).toBeUndefined();
  });

  it("marks write tools as requiring confirmation", () => {
    expect(getTool("list_my_tasks")?.requiresConfirmation).toBe(false);
    expect(getTool("update_task_status")?.requiresConfirmation).toBe(true);
    expect(getTool("assign_task")?.requiresConfirmation).toBe(true);
  });

  it("previews update_task_status without executing", () => {
    const preview = previewToolCall("update_task_status", volunteerActor, {
      taskId: "task_123",
      status: "done",
    });
    expect(preview.argsPreview.taskId).toBe("task_123");
    expect(preview.argsPreview.status).toBe("done");
    expect(preview.summary).toContain("done");
  });

  it("rejects invalid update_task_status args at preview time", () => {
    expect(() =>
      previewToolCall("update_task_status", volunteerActor, { taskId: "x", status: "nope" }),
    ).toThrow();
  });

  it("rejects assign_task preview for volunteers", () => {
    expect(() =>
      previewToolCall("assign_task", volunteerActor, {
        title: "Setup",
        role: "Logistics",
        eventId: "evt_1",
        assigneeId: "user_2",
      }),
    ).toThrow(/not available/i);
  });
});

describe("pending action tokens", () => {
  it("round-trips a signed payload for the same user", () => {
    const token = signPendingAction({
      userId: "user-a",
      toolName: "update_task_status",
      args: { taskId: "t1", status: "done" },
    });
    const verified = verifyPendingAction(token, { expectedUserId: "user-a" });
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.payload.toolName).toBe("update_task_status");
      expect(verified.payload.args).toEqual({ taskId: "t1", status: "done" });
    }
  });

  it("rejects a forged signature", () => {
    const token = signPendingAction({
      userId: "user-a",
      toolName: "update_task_status",
      args: { taskId: "t1", status: "done" },
    });
    const forged = `${token.slice(0, -4)}aaaa`;
    const verified = verifyPendingAction(forged, { expectedUserId: "user-a" });
    expect(verified).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a user mismatch", () => {
    const token = signPendingAction({
      userId: "user-a",
      toolName: "update_task_status",
      args: { taskId: "t1", status: "done" },
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
        toolName: "update_task_status",
        args: { taskId: "t1", status: "done" },
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
      toolName: "update_task_status",
      args: { taskId: "t1", status: "done" },
    });
    expect(verifyPendingAction(token, { expectedUserId: "user-a", consume: true }).ok).toBe(true);
    expect(verifyPendingAction(token, { expectedUserId: "user-a", consume: true })).toEqual({
      ok: false,
      reason: "consumed",
    });
  });
});
