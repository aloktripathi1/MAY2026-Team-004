/**
 * Live Claude + Neon/Postgres integration for Ask Sangam write flow:
 * bulk/single assign, task status, role-audience + targeted announcements.
 *
 * Requires ANTHROPIC_API_KEY and seeded team accounts from helpers.ts.
 * Creates disposable events/volunteers and restores the DB in afterAll.
 */
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { prisma } from "@/backend/db/prisma";
import { clearConsumedPendingActionsForTests } from "@/backend/assistant/agent/pending-action";
import { confirmPendingWrite, REJECT_ANSWER } from "@/backend/assistant/confirm-pending-write";
import { answerAssistantQuery } from "@/backend/domain/assistant";
import type { AssistantSessionUser } from "@/backend/domain/assistant-types";
import {
  deleteAnnouncementsByIds,
  deleteEventsByIds,
  deleteMembershipsByIds,
  deleteUsersByEmails,
} from "./db-cleanup";
import { SEEDED_ACCOUNTS } from "./helpers";

jest.setTimeout(120_000);

const WRITE_MARKER = `jest-write-${Date.now()}`;

const FIXTURE_EMAILS = [
  "soham.write.fixture@ds.study.iitm.ac.in",
  "sai.write.fixture@ds.study.iitm.ac.in",
  "devansh.iyer.write@ds.study.iitm.ac.in",
  "devansh.nair.write@ds.study.iitm.ac.in",
] as const;

async function sessionUserForEmail(email: string): Promise<AssistantSessionUser> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { club: true } } },
  });
  if (!user) throw new Error(`Missing seeded user ${email} — create/login this account first.`);
  return {
    id: user.id,
    isFaculty: user.isFaculty,
    memberships: user.memberships.map((m) => ({
      clubId: m.clubId,
      clubSlug: m.club.slug,
      clubName: m.club.name,
      role: m.role,
      personaName: user.name,
    })),
  };
}

type MembershipSnapshot = {
  id: string;
  role: string;
  status: string;
  existed: boolean;
};

type WriteFixture = {
  clubId: string;
  eventId: string;
  eventTitle: string;
  volunteerA: { userId: string; name: string; email: string };
  volunteerB: { userId: string; name: string; email: string };
  ambiguousName: string;
  ambiguousCandidates: string[];
  statusTaskId: string;
  statusTaskTitle: string;
  ambiguousStatusTitle: string;
  ambiguousStatusTaskIds: string[];
  adminMembership: MembershipSnapshot | null;
  createdMembershipIds: string[];
};

async function upsertVolunteer(
  email: string,
  name: string,
  passwordHash: string,
): Promise<{ id: string; name: string; email: string }> {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      hashedPassword: passwordHash,
      interests: "[]",
      emailVerified: new Date(),
    },
  });
  return { id: user.id, name: user.name, email: user.email };
}

async function ensureActiveVolunteerMembership(
  userId: string,
  clubId: string,
  createdMembershipIds: string[],
): Promise<void> {
  const existing = await prisma.membership.findFirst({ where: { userId, clubId } });
  if (existing) {
    await prisma.membership.update({
      where: { id: existing.id },
      data: { role: "Volunteer", status: "Active" },
    });
    return;
  }
  const created = await prisma.membership.create({
    data: { userId, clubId, role: "Volunteer", status: "Active", joinedAt: new Date() },
  });
  createdMembershipIds.push(created.id);
}

async function ensureWriteFixture(): Promise<WriteFixture> {
  const coordinator = await prisma.user.findUnique({
    where: { email: SEEDED_ACCOUNTS.coordinator.email },
    include: { memberships: true },
  });
  if (!coordinator) throw new Error("Coordinator account missing");

  const coordMembership = coordinator.memberships.find((m) => m.role === "Coordinator" && m.status === "Active");
  if (!coordMembership) throw new Error("Coordinator has no Active Coordinator membership");
  const clubId = coordMembership.clubId;
  const createdMembershipIds: string[] = [];

  const eventTitle = `Ask Sangam Bulk Event ${WRITE_MARKER}`;
  const event = await prisma.event.create({
    data: {
      title: eventTitle,
      slug: `ask-sangam-bulk-${Date.now()}`,
      clubId,
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      time: "6:00 PM",
      venue: "Seminar Hall 1",
      status: "upcoming",
      capacity: 80,
      going: 0,
      cover: "linear-gradient(135deg,#fb923c 0%,#f43f5e 100%)",
      tags: ["Workshop"],
      description: "Integration fixture for Ask Sangam bulk assign.",
      approval: "approved",
    },
  });

  const passwordHash = coordinator.hashedPassword;
  const volA = await upsertVolunteer(FIXTURE_EMAILS[0], "Soham Reddy", passwordHash);
  const volB = await upsertVolunteer(FIXTURE_EMAILS[1], "Sai Dutta", passwordHash);
  const amb1 = await upsertVolunteer(FIXTURE_EMAILS[2], "Devansh Iyer", passwordHash);
  const amb2 = await upsertVolunteer(FIXTURE_EMAILS[3], "Devansh Nair", passwordHash);

  for (const userId of [volA.id, volB.id, amb1.id, amb2.id]) {
    await ensureActiveVolunteerMembership(userId, clubId, createdMembershipIds);
  }

  const admin = await prisma.user.findUnique({
    where: { email: SEEDED_ACCOUNTS.admin.email },
    include: { memberships: true },
  });
  if (!admin) throw new Error("Admin account missing");

  const adminMem = admin.memberships.find((m) => m.clubId === clubId);
  let adminMembership: MembershipSnapshot | null = null;
  if (adminMem) {
    adminMembership = {
      id: adminMem.id,
      role: adminMem.role,
      status: adminMem.status,
      existed: true,
    };
    await prisma.membership.update({
      where: { id: adminMem.id },
      data: { role: "Admin", status: "Active" },
    });
  } else {
    const created = await prisma.membership.create({
      data: { userId: admin.id, clubId, role: "Admin", status: "Active", joinedAt: new Date() },
    });
    adminMembership = { id: created.id, role: "Admin", status: "Active", existed: false };
    createdMembershipIds.push(created.id);
  }

  const statusTaskTitle = `Status board ${WRITE_MARKER}`;
  const statusTask = await prisma.task.create({
    data: {
      title: statusTaskTitle,
      role: "Crew",
      eventId: event.id,
      assigneeId: volA.id,
      status: "todo",
    },
  });

  const ambiguousStatusTitle = `Duplicate status ${WRITE_MARKER}`;
  const ambStatusA = await prisma.task.create({
    data: {
      title: ambiguousStatusTitle,
      role: "Design",
      eventId: event.id,
      assigneeId: volA.id,
      status: "todo",
    },
  });
  const ambStatusB = await prisma.task.create({
    data: {
      title: ambiguousStatusTitle,
      role: "Logistics",
      eventId: event.id,
      assigneeId: volA.id,
      status: "todo",
    },
  });

  return {
    clubId,
    eventId: event.id,
    eventTitle,
    volunteerA: { userId: volA.id, name: volA.name, email: volA.email },
    volunteerB: { userId: volB.id, name: volB.name, email: volB.email },
    ambiguousName: "Devansh",
    ambiguousCandidates: ["Devansh Iyer", "Devansh Nair"],
    statusTaskId: statusTask.id,
    statusTaskTitle,
    ambiguousStatusTitle,
    ambiguousStatusTaskIds: [ambStatusA.id, ambStatusB.id],
    adminMembership,
    createdMembershipIds,
  };
}

async function restoreDatabase(fixture: WriteFixture): Promise<void> {
  await prisma.task.deleteMany({ where: { eventId: fixture.eventId } }).catch(() => undefined);
  await deleteEventsByIds([fixture.eventId]);

  const announcements = await prisma.announcement.findMany({
    where: { clubId: fixture.clubId, title: { contains: WRITE_MARKER } },
    select: { id: true },
  });
  await deleteAnnouncementsByIds(announcements.map((a) => a.id));

  // Sweep any prior aborted-run fixtures with the same naming convention.
  const orphanEvents = await prisma.event.findMany({
    where: { title: { contains: "Ask Sangam Bulk Event jest-write-" } },
    select: { id: true },
  });
  for (const orphan of orphanEvents) {
    await prisma.task.deleteMany({ where: { eventId: orphan.id } }).catch(() => undefined);
  }
  await deleteEventsByIds(orphanEvents.map((e) => e.id));
  await prisma.announcement
    .deleteMany({ where: { title: { contains: "jest-write-" } } })
    .catch(() => undefined);

  if (fixture.adminMembership) {
    if (fixture.adminMembership.existed) {
      await prisma.membership
        .update({
          where: { id: fixture.adminMembership.id },
          data: {
            role: fixture.adminMembership.role as "Admin" | "Coordinator" | "Volunteer" | "Member",
            status: fixture.adminMembership.status as "Active" | "Pending" | "Rejected",
          },
        })
        .catch(() => undefined);
    } else {
      await deleteMembershipsByIds([fixture.adminMembership.id]);
    }
  }

  await deleteMembershipsByIds(fixture.createdMembershipIds);
  await deleteUsersByEmails([...FIXTURE_EMAILS]);
}

beforeAll(() => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required for Ask Sangam write integration tests.");
  }
});

beforeEach(() => {
  clearConsumedPendingActionsForTests();
});

describe("Ask Sangam write flow (live Claude + DB)", () => {
  let fixture: WriteFixture;

  beforeAll(async () => {
    fixture = await ensureWriteFixture();
  });

  afterAll(async () => {
    if (fixture) await restoreDatabase(fixture);
  });

  it("coordinator bulk-assign prompt → proposedAction with signed token (DB unchanged)", async () => {
    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.coordinator.email);
    const before = await prisma.task.count({ where: { eventId: fixture.eventId } });

    const prompt =
      `Assign poster design to ${fixture.volunteerA.name} and booth setup to ${fixture.volunteerB.name} ` +
      `for the event "${fixture.eventTitle}".`;

    const result = await answerAssistantQuery(user, prompt, { activeRole: "coordinator" });

    expect(result.proposedAction).toBeDefined();
    expect(result.proposedAction!.toolName).toBe("propose_bulk_task_assignments");
    expect(result.proposedAction!.token).toMatch(/\./);
    expect(result.proposedAction!.argsPreview.assignments).toBeTruthy();
    expect(await prisma.task.count({ where: { eventId: fixture.eventId } })).toBe(before);
  });

  it("propose → accept bulk assign creates tasks in Postgres", async () => {
    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.coordinator.email);
    const prompt =
      `Assign check-in duty to ${fixture.volunteerA.name} and AV setup to ${fixture.volunteerB.name} ` +
      `for "${fixture.eventTitle}".`;

    const proposed = await answerAssistantQuery(user, prompt, { activeRole: "coordinator" });
    expect(proposed.proposedAction?.token).toBeTruthy();

    const before = await prisma.task.count({ where: { eventId: fixture.eventId } });
    const confirmed = await confirmPendingWrite({
      user,
      decision: "accept",
      token: proposed.proposedAction!.token,
    });

    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) {
      expect(confirmed.data.answer.toLowerCase()).toMatch(/created|task/);
      expect(confirmed.data.sourceHref).toBe("/coordinator/volunteers");
    }

    const after = await prisma.task.count({ where: { eventId: fixture.eventId } });
    expect(after).toBeGreaterThanOrEqual(before + 2);

    const created = await prisma.task.findMany({
      where: {
        eventId: fixture.eventId,
        assigneeId: { in: [fixture.volunteerA.userId, fixture.volunteerB.userId] },
      },
      take: 10,
    });
    expect(created.length).toBeGreaterThanOrEqual(2);
  });

  it("propose → reject bulk assign leaves DB unchanged and returns fixed message", async () => {
    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.coordinator.email);
    const prompt =
      `Assign stage lighting to ${fixture.volunteerA.name} and registration desk to ${fixture.volunteerB.name} ` +
      `for "${fixture.eventTitle}".`;

    const proposed = await answerAssistantQuery(user, prompt, { activeRole: "coordinator" });
    expect(proposed.proposedAction?.token).toBeTruthy();

    const before = await prisma.task.count({ where: { eventId: fixture.eventId } });
    const rejected = await confirmPendingWrite({
      user,
      decision: "reject",
      token: proposed.proposedAction!.token,
    });

    expect(rejected.ok).toBe(true);
    if (rejected.ok) {
      expect(rejected.data.answer).toBe(REJECT_ANSWER);
    }
    expect(await prisma.task.count({ where: { eventId: fixture.eventId } })).toBe(before);
  });

  it("coordinator single-assign → assign_task propose → accept creates one task", async () => {
    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.coordinator.email);
    const title = `Single assign ${WRITE_MARKER}`;
    const proposed = await answerAssistantQuery(
      user,
      `Assign "${title}" to ${fixture.volunteerB.name} for the event "${fixture.eventTitle}".`,
      { activeRole: "coordinator" },
    );

    expect(proposed.proposedAction?.toolName).toBe("assign_task");
    expect(proposed.proposedAction?.token).toMatch(/\./);

    const confirmed = await confirmPendingWrite({
      user,
      decision: "accept",
      token: proposed.proposedAction!.token,
    });
    expect(confirmed.ok).toBe(true);

    const row = await prisma.task.findFirst({
      where: { eventId: fixture.eventId, title: { contains: WRITE_MARKER }, assigneeId: fixture.volunteerB.userId },
      orderBy: { id: "desc" },
    });
    expect(row).toBeTruthy();
    expect(row!.status).toBe("todo");
  });

  it("volunteer marks own task doing → update_task_status accept updates Postgres", async () => {
    const user = await sessionUserForEmail(fixture.volunteerA.email);
    const proposed = await answerAssistantQuery(
      user,
      `Mark "${fixture.statusTaskTitle}" as doing.`,
      { activeRole: "volunteer" },
    );

    expect(proposed.proposedAction?.toolName).toBe("update_task_status");
    expect(proposed.proposedAction?.token).toMatch(/\./);

    const confirmed = await confirmPendingWrite({
      user,
      decision: "accept",
      token: proposed.proposedAction!.token,
    });
    expect(confirmed.ok).toBe(true);

    const updated = await prisma.task.findUnique({ where: { id: fixture.statusTaskId } });
    expect(updated?.status).toBe("doing");
  });

  it("ambiguous task status → offer_task_status_choices (no chat-only guess)", async () => {
    const user = await sessionUserForEmail(fixture.volunteerA.email);
    const result = await answerAssistantQuery(
      user,
      `Mark "${fixture.ambiguousStatusTitle}" as done.`,
      { activeRole: "volunteer" },
    );

    expect(result.proposedAction?.toolName).toBe("update_task_status");
    expect(result.proposedAction?.choices?.length).toBeGreaterThanOrEqual(2);
    expect(result.proposedAction?.token).toBe("");

    const choice = result.proposedAction!.choices!.find((c) =>
      fixture.ambiguousStatusTaskIds.includes(c.id),
    );
    expect(choice?.token).toMatch(/\./);

    const confirmed = await confirmPendingWrite({
      user,
      decision: "accept",
      token: choice!.token,
    });
    expect(confirmed.ok).toBe(true);

    const accepted = await prisma.task.findUnique({ where: { id: choice!.id } });
    expect(accepted?.status).toBe("done");
  });

  it("admin announcement prompt → proposedAction with timing choices (DB unchanged)", async () => {
    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.admin.email);
    const title = `Rehearsal moved ${WRITE_MARKER}`;
    const before = await prisma.announcement.count({ where: { clubId: fixture.clubId } });

    const result = await answerAssistantQuery(
      user,
      `Draft a high priority announcement titled "${title}" saying Friday rehearsal is moved to 7pm for all members.`,
      { activeRole: "admin" },
    );

    expect(result.proposedAction).toBeDefined();
    expect(result.proposedAction!.toolName).toBe("propose_announcement");
    expect(result.proposedAction!.choices?.length).toBe(6);
    expect(result.proposedAction!.choiceGroups?.map((g) => g.id).sort()).toEqual([
      "audience",
      "timing",
    ]);
    const digestAll = result.proposedAction!.choices!.find((c) => c.id === "All__digest");
    expect(digestAll?.token).toMatch(/\./);
    expect(result.proposedAction!.defaultGroupSelections?.audience).toBeTruthy();
    expect(result.proposedAction!.argsPreview.title).toBeTruthy();
    expect(result.proposedAction!.argsPreview.body).toBeTruthy();
    expect(await prisma.announcement.count({ where: { clubId: fixture.clubId } })).toBe(before);
  });

  it("propose → accept announcement posts row via createAnnouncement path", async () => {
    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.admin.email);
    const title = `Posted announce ${WRITE_MARKER}`;

    const proposed = await answerAssistantQuery(
      user,
      `Post an announcement titled "${title}" with body "Integration accept path for Ask Sangam." audience All.`,
      { activeRole: "admin" },
    );
    const digestChoice = proposed.proposedAction?.choices?.find((c) => c.id === "All__digest");
    expect(digestChoice?.token).toBeTruthy();

    const confirmed = await confirmPendingWrite({
      user,
      decision: "accept",
      token: digestChoice!.token,
    });
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) {
      expect(confirmed.data.sourceHref).toBe("/admin/announcements");
      expect(confirmed.data.answer.toLowerCase()).toMatch(/posted|announcement/);
    }

    const row = await prisma.announcement.findFirst({
      where: { clubId: fixture.clubId, title: { contains: WRITE_MARKER } },
      orderBy: { createdAt: "desc" },
    });
    expect(row).toBeTruthy();
    expect(row!.title).toContain(WRITE_MARKER);
    expect(row!.priority).toBe("Med");
    expect(row!.recipientUserIds).toEqual([]);
  });

  it("admin send_now choice posts High priority announcement", async () => {
    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.admin.email);
    const title = `Send now announce ${WRITE_MARKER}`;

    const proposed = await answerAssistantQuery(
      user,
      `Draft an announcement titled "${title}" saying the venue changed to Hall B for all members.`,
      { activeRole: "admin" },
    );
    const sendNow = proposed.proposedAction?.choices?.find((c) => c.id === "All__send_now");
    expect(sendNow?.token).toBeTruthy();

    const confirmed = await confirmPendingWrite({
      user,
      decision: "accept",
      token: sendNow!.token,
    });
    expect(confirmed.ok).toBe(true);

    const row = await prisma.announcement.findFirst({
      where: { clubId: fixture.clubId, title },
    });
    expect(row).toBeTruthy();
    expect(row!.priority).toBe("High");
    expect(row!.audience).toBe("All");
  });

  it("targeted announcement for a named person → specific timing choices → recipientUserIds persisted", async () => {
    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.admin.email);
    const title = `Targeted announce ${WRITE_MARKER}`;

    const proposed = await answerAssistantQuery(
      user,
      `Draft an announcement titled "${title}" saying please bring your laptop, for ${fixture.volunteerA.name} only.`,
      { activeRole: "admin" },
    );

    expect(proposed.proposedAction?.toolName).toBe("propose_announcement");
    expect(proposed.proposedAction?.choices?.map((c) => c.id).sort()).toEqual([
      "specific__digest",
      "specific__send_now",
    ]);
    expect(proposed.proposedAction?.choiceGroups?.find((g) => g.id === "audience")?.options).toHaveLength(1);
    expect(proposed.proposedAction?.defaultGroupSelections?.audience).toBe("specific");
    expect(proposed.proposedAction?.argsPreview.to?.toLowerCase()).toContain(
      fixture.volunteerA.name.split(" ")[0]!.toLowerCase(),
    );

    const digest = proposed.proposedAction!.choices!.find((c) => c.id === "specific__digest");
    expect(digest?.token).toMatch(/\./);

    const confirmed = await confirmPendingWrite({
      user,
      decision: "accept",
      token: digest!.token,
    });
    expect(confirmed.ok).toBe(true);

    const row = await prisma.announcement.findFirst({
      where: { clubId: fixture.clubId, title },
    });
    expect(row).toBeTruthy();
    expect(row!.priority).toBe("Med");
    expect(row!.recipientUserIds).toEqual([fixture.volunteerA.userId]);
  });

  it("propose → reject announcement leaves DB unchanged", async () => {
    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.admin.email);
    const title = `Rejected announce ${WRITE_MARKER}-${Date.now()}`;

    const proposed = await answerAssistantQuery(
      user,
      `Draft an announcement titled "${title}" saying this should never be posted.`,
      { activeRole: "admin" },
    );
    const sendNow = proposed.proposedAction?.choices?.find((c) => c.id === "All__send_now");
    expect(sendNow?.token).toBeTruthy();

    const beforeIds = new Set(
      (
        await prisma.announcement.findMany({
          where: { clubId: fixture.clubId },
          select: { id: true },
        })
      ).map((a) => a.id),
    );

    const rejected = await confirmPendingWrite({
      user,
      decision: "reject",
      token: sendNow!.token,
    });
    expect(rejected.ok).toBe(true);
    if (rejected.ok) expect(rejected.data.answer).toBe(REJECT_ANSWER);

    const stillMissing = await prisma.announcement.findFirst({ where: { title } });
    expect(stillMissing).toBeNull();

    const afterIds = (
      await prisma.announcement.findMany({
        where: { clubId: fixture.clubId },
        select: { id: true },
      })
    ).map((a) => a.id);
    expect(afterIds.every((id) => beforeIds.has(id))).toBe(true);
  });

  it("wrong shell role offers no write tools / refuses write", async () => {
    const coordinator = await sessionUserForEmail(SEEDED_ACCOUNTS.coordinator.email);
    const asAdminShell = await answerAssistantQuery(
      coordinator,
      `Assign poster to ${fixture.volunteerA.name} for "${fixture.eventTitle}"`,
      { activeRole: "admin" },
    );
    expect(asAdminShell.proposedAction).toBeUndefined();
    expect(asAdminShell.answer.toLowerCase()).toMatch(/isn't available|not available|coordinator|admin|can't|cannot/);

    const admin = await sessionUserForEmail(SEEDED_ACCOUNTS.admin.email);
    const asCoordShell = await answerAssistantQuery(
      admin,
      `Assign poster to ${fixture.volunteerA.name} for "${fixture.eventTitle}"`,
      { activeRole: "coordinator" },
    );
    expect(asCoordShell.proposedAction).toBeUndefined();
  });

  it("admin shell can update task status and assign tasks — Admin inherits Coordinator's task-board rights", async () => {
    const admin = await sessionUserForEmail(SEEDED_ACCOUNTS.admin.email);

    const status = await answerAssistantQuery(admin, `Mark "${fixture.statusTaskTitle}" as done.`, {
      activeRole: "admin",
    });
    expect(status.proposedAction?.toolName).toBe("update_task_status");
    expect(status.proposedAction?.token).toMatch(/\./);

    const confirmedStatus = await confirmPendingWrite({
      user: admin,
      decision: "accept",
      token: status.proposedAction!.token,
    });
    expect(confirmedStatus.ok).toBe(true);

    const updatedTask = await prisma.task.findUnique({ where: { id: fixture.statusTaskId } });
    expect(updatedTask?.status).toBe("done");

    const title = `Admin single assign ${WRITE_MARKER}`;
    const assign = await answerAssistantQuery(
      admin,
      `Assign "${title}" to ${fixture.volunteerB.name} for the event "${fixture.eventTitle}".`,
      { activeRole: "admin" },
    );
    expect(assign.proposedAction?.toolName).toBe("assign_task");
    expect(assign.proposedAction?.token).toMatch(/\./);

    const confirmedAssign = await confirmPendingWrite({
      user: admin,
      decision: "accept",
      token: assign.proposedAction!.token,
    });
    expect(confirmedAssign.ok).toBe(true);

    const row = await prisma.task.findFirst({
      where: { eventId: fixture.eventId, title: { contains: WRITE_MARKER }, assigneeId: fixture.volunteerB.userId },
      orderBy: { id: "desc" },
    });
    expect(row).toBeTruthy();
    expect(row!.status).toBe("todo");
  });

  it("volunteer shell refuses assign and announcement writes", async () => {
    const volunteer = await sessionUserForEmail(SEEDED_ACCOUNTS.volunteer.email);

    const assign = await answerAssistantQuery(
      volunteer,
      `Assign poster to ${fixture.volunteerA.name} for "${fixture.eventTitle}".`,
      { activeRole: "volunteer" },
    );
    expect(assign.proposedAction).toBeUndefined();

    const announce = await answerAssistantQuery(
      volunteer,
      `Draft an announcement titled "Volunteer cannot ${WRITE_MARKER}" saying hi for all members.`,
      { activeRole: "volunteer" },
    );
    expect(announce.proposedAction).toBeUndefined();
  });

  it("coordinator shell refuses announcement writes", async () => {
    const coordinator = await sessionUserForEmail(SEEDED_ACCOUNTS.coordinator.email);
    const result = await answerAssistantQuery(
      coordinator,
      `Draft an announcement titled "Coord cannot ${WRITE_MARKER}" saying rehearsal cancelled for all members.`,
      { activeRole: "coordinator" },
    );
    expect(result.proposedAction).toBeUndefined();
    expect(result.answer.toLowerCase()).toMatch(/admin|isn't available|not available|announcement/);
  });

  it("member shell refuses write intents", async () => {
    const member = await sessionUserForEmail(SEEDED_ACCOUNTS.member.email);
    const result = await answerAssistantQuery(
      member,
      `Assign poster to ${fixture.volunteerA.name} for "${fixture.eventTitle}".`,
      { activeRole: "member" },
    );
    expect(result.proposedAction).toBeUndefined();
  });

  it("ambiguous member name → clarifying answer, no proposedAction", async () => {
    const user = await sessionUserForEmail(SEEDED_ACCOUNTS.coordinator.email);
    const result = await answerAssistantQuery(
      user,
      `Assign poster design to ${fixture.ambiguousName} for the event "${fixture.eventTitle}".`,
      { activeRole: "coordinator" },
    );

    expect(result.proposedAction).toBeUndefined();
    const lower = result.answer.toLowerCase();
    expect(
      lower.includes("devansh") || lower.includes("which") || lower.includes("ambiguous") || lower.includes("clarify"),
    ).toBe(true);
  });
});
