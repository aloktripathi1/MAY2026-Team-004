/**
 * Domain-level integration for bulk assign, single assign, task status,
 * and announcement create (including targeted recipients) used by Ask Sangam.
 * Does not require Claude — exercises Prisma + authz paths.
 * Sets up required event/volunteer rows and restores the DB in afterAll.
 */
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { prisma } from "@/backend/db/prisma";
import { resolve_club_members_by_name } from "@/backend/assistant/tools/announcement-tools";
import type { ToolActor } from "@/backend/assistant/tools/types";
import { createAnnouncement } from "@/backend/domain/announcements";
import {
  assignTask,
  assignTasksBulk,
  BULK_ASSIGN_MAX_ROWS,
  updateTaskStatus,
} from "@/backend/domain/tasks";
import {
  deleteAnnouncementsByIds,
  deleteEventsByIds,
  deleteMembershipsByIds,
  deleteTasksByIds,
  deleteUsersByEmails,
} from "./db-cleanup";
import { SEEDED_ACCOUNTS } from "./helpers";

const TOOLS_MARKER = `jest-tools-${Date.now()}`;
const FIXTURE_EMAILS = [
  `jest.tools.vol.a.${Date.now()}@ds.study.iitm.ac.in`,
  `jest.tools.vol.b.${Date.now()}@ds.study.iitm.ac.in`,
] as const;

type Actor = {
  id: string;
  memberships: Array<{
    clubId: string;
    clubSlug: string;
    clubName: string;
    role: string;
    personaName: string;
  }>;
};

type ToolsFixture = {
  clubId: string;
  eventId: string;
  volunteers: Array<{ userId: string; name: string; email: string }>;
  createdMembershipIds: string[];
  createdUserEmails: string[];
  announcementIds: string[];
  taskIds: string[];
  adminMembership: { id: string; role: string; status: string; existed: boolean } | null;
};

async function actorForEmail(email: string): Promise<Actor> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { club: true } } },
  });
  if (!user) throw new Error(`Missing user ${email}`);
  return {
    id: user.id,
    memberships: user.memberships.map((m) => ({
      clubId: m.clubId,
      clubSlug: m.club.slug,
      clubName: m.club.name,
      role: m.role,
      personaName: user.name,
    })),
  };
}

function toToolActor(actor: Actor): ToolActor {
  return {
    id: actor.id,
    isFaculty: false,
    memberships: actor.memberships as ToolActor["memberships"],
  };
}

async function ensureToolsFixture(): Promise<ToolsFixture> {
  const coordinator = await prisma.user.findUnique({
    where: { email: SEEDED_ACCOUNTS.coordinator.email },
    include: { memberships: true },
  });
  if (!coordinator) throw new Error("Coordinator missing");

  const clubId = coordinator.memberships.find((m) => m.role === "Coordinator" && m.status === "Active")?.clubId;
  if (!clubId) throw new Error("Coordinator has no Active Coordinator membership");

  const createdMembershipIds: string[] = [];
  const createdUserEmails: string[] = [];
  const announcementIds: string[] = [];
  const taskIds: string[] = [];

  const event = await prisma.event.create({
    data: {
      title: `Jest tools event ${TOOLS_MARKER}`,
      slug: `jest-tools-${Date.now()}`,
      clubId,
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      time: "5:00 PM",
      venue: "Hall A",
      status: "upcoming",
      capacity: 50,
      going: 0,
      cover: "linear-gradient(135deg,#fb923c 0%,#f43f5e 100%)",
      tags: ["Workshop"],
      description: "Created by assistant-tools integration test.",
      approval: "approved",
    },
  });

  const volunteers: ToolsFixture["volunteers"] = [];
  for (let i = 0; i < FIXTURE_EMAILS.length; i++) {
    const email = FIXTURE_EMAILS[i]!;
    const user = await prisma.user.create({
      data: {
        email,
        name: `Jest Tools Volunteer ${i + 1}`,
        hashedPassword: coordinator.hashedPassword,
        interests: "[]",
        emailVerified: new Date(),
      },
    });
    createdUserEmails.push(email);
    const membership = await prisma.membership.create({
      data: { userId: user.id, clubId, role: "Volunteer", status: "Active", joinedAt: new Date() },
    });
    createdMembershipIds.push(membership.id);
    volunteers.push({ userId: user.id, name: user.name, email });
  }

  const admin = await prisma.user.findUnique({
    where: { email: SEEDED_ACCOUNTS.admin.email },
    include: { memberships: true },
  });
  if (!admin) throw new Error("Admin missing");

  const adminMem = admin.memberships.find((m) => m.clubId === clubId);
  let adminMembership: ToolsFixture["adminMembership"] = null;
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

  return {
    clubId,
    eventId: event.id,
    volunteers,
    createdMembershipIds,
    createdUserEmails,
    announcementIds,
    taskIds,
    adminMembership,
  };
}

async function restoreToolsFixture(fixture: ToolsFixture): Promise<void> {
  await deleteTasksByIds(fixture.taskIds);
  await prisma.task.deleteMany({ where: { eventId: fixture.eventId } }).catch(() => undefined);
  await deleteEventsByIds([fixture.eventId]);
  await deleteAnnouncementsByIds(fixture.announcementIds);
  await prisma.announcement
    .deleteMany({
      where: { clubId: fixture.clubId, title: { contains: TOOLS_MARKER } },
    })
    .catch(() => undefined);

  const orphanEvents = await prisma.event.findMany({
    where: { title: { contains: "Jest tools event jest-tools-" } },
    select: { id: true },
  });
  for (const orphan of orphanEvents) {
    await prisma.task.deleteMany({ where: { eventId: orphan.id } }).catch(() => undefined);
  }
  await deleteEventsByIds(orphanEvents.map((e) => e.id));
  await prisma.announcement.deleteMany({ where: { title: { contains: "jest-tools-" } } }).catch(() => undefined);

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
  await deleteUsersByEmails(fixture.createdUserEmails);
}

describe("Ask Sangam domain write helpers (real DB)", () => {
  let fixture: ToolsFixture;

  beforeAll(async () => {
    fixture = await ensureToolsFixture();
  });

  afterAll(async () => {
    if (fixture) await restoreToolsFixture(fixture);
  });

  describe("assignTasksBulk", () => {
    it("creates multiple tasks all-or-nothing for a coordinator", async () => {
      const actor = await actorForEmail(SEEDED_ACCOUNTS.coordinator.email);
      const titleA = `Jest bulk A ${TOOLS_MARKER}`;
      const titleB = `Jest bulk B ${TOOLS_MARKER}`;

      const tasks = await assignTasksBulk(actor, [
        {
          title: titleA,
          role: "Design",
          eventId: fixture.eventId,
          assigneeId: fixture.volunteers[0]!.userId,
        },
        {
          title: titleB,
          role: "Logistics",
          eventId: fixture.eventId,
          assigneeId: fixture.volunteers[1]!.userId,
        },
      ]);

      expect(tasks).toHaveLength(2);
      fixture.taskIds.push(...tasks.map((t) => t.id));

      const found = await prisma.task.findMany({ where: { id: { in: tasks.map((t) => t.id) } } });
      expect(found).toHaveLength(2);
    });

    it("creates nothing when any row is invalid", async () => {
      const actor = await actorForEmail(SEEDED_ACCOUNTS.coordinator.email);
      const before = await prisma.task.count({ where: { eventId: fixture.eventId } });

      await expect(
        assignTasksBulk(actor, [
          {
            title: "Valid row",
            role: "Crew",
            eventId: fixture.eventId,
            assigneeId: fixture.volunteers[0]!.userId,
          },
          {
            title: "Bad assignee",
            role: "Crew",
            eventId: fixture.eventId,
            assigneeId: "does-not-exist",
          },
        ]),
      ).rejects.toThrow(/validation failed/i);

      const after = await prisma.task.count({ where: { eventId: fixture.eventId } });
      expect(after).toBe(before);
    });

    it("rejects bulk over the max row cap", async () => {
      const actor = await actorForEmail(SEEDED_ACCOUNTS.coordinator.email);
      const rows = Array.from({ length: BULK_ASSIGN_MAX_ROWS + 1 }, (_, i) => ({
        title: `T${i}`,
        role: "Crew",
        eventId: fixture.eventId,
        assigneeId: fixture.volunteers[0]!.userId,
      }));
      await expect(assignTasksBulk(actor, rows)).rejects.toThrow(/limited to/);
    });
  });

  describe("assignTask + updateTaskStatus", () => {
    it("coordinator assigns one task then volunteer updates own status", async () => {
      const coordinator = await actorForEmail(SEEDED_ACCOUNTS.coordinator.email);
      const title = `Single domain ${TOOLS_MARKER}`;

      const task = await assignTask(coordinator, {
        title,
        role: "Crew",
        eventId: fixture.eventId,
        assigneeId: fixture.volunteers[0]!.userId,
      });
      fixture.taskIds.push(task.id);
      expect(task.status).toBe("todo");

      const volunteerActor: Actor = {
        id: fixture.volunteers[0]!.userId,
        memberships: [
          {
            clubId: fixture.clubId,
            clubSlug: "fixture",
            clubName: "Fixture",
            role: "Volunteer",
            personaName: fixture.volunteers[0]!.name,
          },
        ],
      };

      const updated = await updateTaskStatus(volunteerActor, task.id, "doing");
      expect(updated.status).toBe("doing");

      const fromDb = await prisma.task.findUnique({ where: { id: task.id } });
      expect(fromDb?.status).toBe("doing");
    });

    it("refuses status update from an unrelated member", async () => {
      const coordinator = await actorForEmail(SEEDED_ACCOUNTS.coordinator.email);
      const task = await assignTask(coordinator, {
        title: `Authz status ${TOOLS_MARKER}`,
        role: "Crew",
        eventId: fixture.eventId,
        assigneeId: fixture.volunteers[0]!.userId,
      });
      fixture.taskIds.push(task.id);

      const stranger = await actorForEmail(SEEDED_ACCOUNTS.member.email);
      await expect(updateTaskStatus(stranger, task.id, "done")).rejects.toThrow(/not authorized/i);
    });
  });

  describe("createAnnouncement", () => {
    it("posts for an admin and refuses a coordinator", async () => {
      const admin = await actorForEmail(SEEDED_ACCOUNTS.admin.email);
      const coordinator = await actorForEmail(SEEDED_ACCOUNTS.coordinator.email);

      const announcement = await createAnnouncement(admin, {
        title: `Jest announce ${TOOLS_MARKER}`,
        body: "Integration test body",
        audience: "All",
        priority: "Low",
        clubId: fixture.clubId,
      });
      fixture.announcementIds.push(announcement.id);
      expect(announcement.id).toBeTruthy();
      expect(announcement.recipientUserIds).toEqual([]);

      await expect(
        createAnnouncement(coordinator, {
          title: "Nope",
          body: "Should fail",
          audience: "All",
          priority: "Low",
          clubId: fixture.clubId,
        }),
      ).rejects.toThrow(/admin/i);
    });

    it("stores recipientUserIds for targeted announcements and rejects non-members", async () => {
      const admin = await actorForEmail(SEEDED_ACCOUNTS.admin.email);
      const target = fixture.volunteers[0]!;

      const targeted = await createAnnouncement(admin, {
        title: `Targeted ${TOOLS_MARKER}`,
        body: "Only for one volunteer",
        audience: "All",
        priority: "Med",
        clubId: fixture.clubId,
        recipientUserIds: [target.userId],
      });
      fixture.announcementIds.push(targeted.id);

      const fromDb = await prisma.announcement.findUnique({ where: { id: targeted.id } });
      expect(fromDb?.recipientUserIds).toEqual([target.userId]);
      expect(fromDb?.audience).toBe("All");

      await expect(
        createAnnouncement(admin, {
          title: `Bad target ${TOOLS_MARKER}`,
          body: "Should fail",
          audience: "All",
          priority: "Low",
          clubId: fixture.clubId,
          recipientUserIds: ["not-a-club-member"],
        }),
      ).rejects.toThrow(/active member/i);
    });
  });

  describe("resolve_club_members_by_name", () => {
    it("resolves unique names and reports ambiguous / missing", async () => {
      const admin = await actorForEmail(SEEDED_ACCOUNTS.admin.email);
      const actor = toToolActor(admin);
      const unique = fixture.volunteers[0]!;

      const resolved = await resolve_club_members_by_name.execute(actor, {
        names: [unique.name],
        clubId: fixture.clubId,
      });
      const data = resolved.data as {
        resolved: Array<{ userId: string; name: string }>;
        ambiguous: unknown[];
        missing: string[];
      };
      expect(data.resolved).toHaveLength(1);
      expect(data.resolved[0]!.userId).toBe(unique.userId);
      expect(data.ambiguous).toHaveLength(0);
      expect(data.missing).toHaveLength(0);

      const missing = await resolve_club_members_by_name.execute(actor, {
        names: ["Definitely Missing Person XYZ"],
        clubId: fixture.clubId,
      });
      const missingData = missing.data as { missing: string[] };
      expect(missingData.missing).toContain("Definitely Missing Person XYZ");
    });
  });
});
