/**
 * Integration tests for Ask Sangam task tooling: signed pending actions and
 * POST /api/assistant/confirm. The full Claude propose loop is covered when
 * ANTHROPIC_API_KEY is available and the volunteer has an open task.
 */
import { prisma } from "@/backend/db/prisma";
import { signPendingAction, clearConsumedPendingActionsForTests } from "@/backend/assistant/agent/pending-action";
import { ApiClient, isApiAvailable, requireApiAvailable, login, SEEDED_ACCOUNTS } from "./helpers";

const QUERY_PATH = "/api/assistant/query";
const CONFIRM_PATH = "/api/assistant/confirm";

jest.setTimeout(60_000);

beforeAll(async () => {
  requireApiAvailable(await isApiAvailable());
});

beforeEach(() => {
  clearConsumedPendingActionsForTests();
});

async function findVolunteerOpenTask() {
  const volunteer = await prisma.user.findUnique({ where: { email: SEEDED_ACCOUNTS.volunteer.email } });
  if (!volunteer) return null;
  return prisma.task.findFirst({
    where: { assigneeId: volunteer.id, status: { not: "done" } },
    orderBy: { id: "asc" },
  });
}

describe("POST /api/assistant/confirm", () => {
  it("rejects unauthenticated confirm requests", async () => {
    const client = new ApiClient();
    const res = await client.request("POST", CONFIRM_PATH, {
      json: { decision: "accept", token: "not-a-token" },
    });
    expect(res.status).toBe(401);
  });

  it("rejects a forged token", async () => {
    const client = new ApiClient();
    await login(client, SEEDED_ACCOUNTS.volunteer.email, SEEDED_ACCOUNTS.volunteer.password);
    const res = await client.request("POST", CONFIRM_PATH, {
      json: { decision: "accept", token: "forged.payload" },
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("accepts a signed update_task_status proposal and updates Neon", async () => {
    const task = await findVolunteerOpenTask();
    if (!task) return;

    const volunteer = await prisma.user.findUnique({ where: { email: SEEDED_ACCOUNTS.volunteer.email } });
    const previousStatus = task.status;

    const token = signPendingAction({
      userId: volunteer!.id,
      toolName: "update_task_status",
      args: { taskId: task.id, status: "done" },
    });

    const client = new ApiClient();
    await login(client, SEEDED_ACCOUNTS.volunteer.email, SEEDED_ACCOUNTS.volunteer.password);

    const accept = await client.request("POST", CONFIRM_PATH, {
      json: { decision: "accept", token },
    });
    expect(accept.status).toBe(200);
    expect(accept.body.success).toBe(true);
    expect(accept.body.data.sourceType).toBe("task");
    expect(accept.body.data.answer.toLowerCase()).toContain("done");

    const updated = await prisma.task.findUnique({ where: { id: task.id } });
    expect(updated?.status).toBe("done");

    const second = await client.request("POST", CONFIRM_PATH, {
      json: { decision: "accept", token },
    });
    expect(second.status).toBe(400);

    // Restore so other tests / re-runs stay stable.
    await prisma.task.update({ where: { id: task.id }, data: { status: previousStatus } });
  });

  it("reject leaves the task unchanged and blocks later accept", async () => {
    const task = await findVolunteerOpenTask();
    if (!task) return;

    const volunteer = await prisma.user.findUnique({ where: { email: SEEDED_ACCOUNTS.volunteer.email } });
    const token = signPendingAction({
      userId: volunteer!.id,
      toolName: "update_task_status",
      args: { taskId: task.id, status: "done" },
    });

    const client = new ApiClient();
    await login(client, SEEDED_ACCOUNTS.volunteer.email, SEEDED_ACCOUNTS.volunteer.password);

    const reject = await client.request("POST", CONFIRM_PATH, {
      json: { decision: "reject", token },
    });
    expect(reject.status).toBe(200);
    expect(reject.body.data.answer).toMatch(/won't make that change/i);

    const unchanged = await prisma.task.findUnique({ where: { id: task.id } });
    expect(unchanged?.status).toBe(task.status);

    const accept = await client.request("POST", CONFIRM_PATH, {
      json: { decision: "accept", token },
    });
    expect(accept.status).toBe(400);
  });
});

describe("POST /api/assistant/query task_action propose path", () => {
  it("proposes a write (no DB change) when asked to mark a task done", async () => {
    const task = await findVolunteerOpenTask();
    if (!task) return;
    if (!process.env.ANTHROPIC_API_KEY) return;

    const client = new ApiClient();
    await login(client, SEEDED_ACCOUNTS.volunteer.email, SEEDED_ACCOUNTS.volunteer.password);

    const res = await client.request("POST", QUERY_PATH, {
      json: { query: `Mark my task "${task.title}" as done` },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Classifier/tool loop should propose — not mutate yet.
    const stillOpen = await prisma.task.findUnique({ where: { id: task.id } });
    expect(stillOpen?.status).toBe(task.status);

    if (res.body.data.proposedAction) {
      expect(res.body.data.proposedAction.toolName).toBe("update_task_status");
      expect(res.body.data.proposedAction.token).toBeTruthy();
      expect(res.body.data.proposedAction.status).toBe("pending");
    }
  });
});
