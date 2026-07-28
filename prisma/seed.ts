import bcrypt from "bcrypt";
import { PrismaClient, type ApprovalStatus, type IssueStatus, type Prisma } from "@prisma/client";
import {
  announcements as seedAnnouncements,
  clubs as seedClubs,
  contributions as seedContributions,
  events as seedEvents,
  issues as seedIssues,
  members as seedMembers,
  resources as seedResources,
  tasks as seedTasks,
  transparencyLog,
} from "../lib/seed-data.ts";

const prisma = new PrismaClient();

const clubNameToSlug: Record<string, string> = {
  CodeChef: "codechef",
  "E-Cell": "e-cell",
  Sarga: "sarga",
  Paradox: "paradox",
  Kalakriti: "kalakriti",
  Arena: "arena",
  Prakriti: "prakriti",
  Quill: "quill",
};

function memberUserId(memberId: string) {
  return memberId.replace("m", "u");
}

function mapApproval(approval: string): ApprovalStatus {
  if (approval === "not-required") return "notRequired";
  if (approval === "approved" || approval === "pending" || approval === "rejected") return approval;
  return "pending";
}

function mapIssueStatus(status: string): IssueStatus {
  if (status === "In progress") return "InProgress";
  if (status === "Open" || status === "Resolved" || status === "InProgress") return status;
  return "Open";
}

function parseJoined(joined: string) {
  const parsed = new Date(`1 ${joined}`);
  return Number.isNaN(parsed.getTime()) ? new Date("2023-08-01") : parsed;
}

async function main() {
  // Wipe in FK-safe order so re-seed is idempotent.
  await prisma.countMeIn.deleteMany();
  await prisma.contribution.deleteMany();
  await prisma.task.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.transparencyLogEntry.deleteMany();
  await prisma.event.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.club.deleteMany();

  const passwordHash = await bcrypt.hash("sangam", 10);

  await prisma.club.createMany({
    data: seedClubs.map((club) => ({
      id: club.id,
      slug: club.slug,
      name: club.name,
      tagline: club.tagline,
      category: club.category,
      active: club.active,
      hue: club.hue,
      emoji: club.emoji,
      founded: club.founded,
      description: club.description,
      banner: club.banner,
      photo: club.photo ?? null,
    })),
  });

  const users = [
    ...seedMembers.map((member) => ({
      id: memberUserId(member.id),
      email: `${member.roll}@ds.study.iitm.ac.in`,
      name: member.name,
      rollNumber: member.roll,
      hashedPassword: passwordHash,
      interests:
        member.id === "m1"
          ? JSON.stringify(["Technical", "Design", "Entrepreneurship"])
          : "[]",
      isFaculty: false,
    })),
    {
      id: "u-faculty",
      email: "faculty.mentor@ds.study.iitm.ac.in",
      name: "Prof. R. Krishnan",
      rollNumber: null as string | null,
      hashedPassword: passwordHash,
      interests: "[]",
      isFaculty: true,
    },
  ];

  await prisma.user.createMany({ data: users });

  const membershipRows: Prisma.MembershipCreateManyInput[] = seedMembers.flatMap((member) =>
    member.clubs.map((clubName) => {
      const clubSlug = clubNameToSlug[clubName] ?? clubName.toLowerCase();
      const club = seedClubs.find((c) => c.slug === clubSlug) ?? seedClubs[0];
      return {
        id: `${member.id}-${club.slug}`,
        userId: memberUserId(member.id),
        clubId: club.id,
        role: member.role,
        status: member.status,
        joinedAt: parseJoined(member.joined),
      };
    }),
  );

  // Demo session (u1) holds four roles for QA persona switching.
  const demoMemberships: Prisma.MembershipCreateManyInput[] = [
    { id: "m1-codechef", userId: "u1", clubId: "c1", role: "Admin", status: "Active", joinedAt: parseJoined("Aug 2023") },
    { id: "demo-u1-e-cell", userId: "u1", clubId: "c6", role: "Coordinator", status: "Active", joinedAt: parseJoined("Aug 2023") },
    { id: "demo-u1-sarga", userId: "u1", clubId: "c3", role: "Volunteer", status: "Active", joinedAt: parseJoined("Aug 2023") },
    { id: "demo-u1-paradox", userId: "u1", clubId: "c2", role: "Member", status: "Active", joinedAt: parseJoined("Aug 2023") },
  ];

  const membershipByKey = new Map<string, Prisma.MembershipCreateManyInput>();
  for (const row of [...membershipRows, ...demoMemberships]) {
    membershipByKey.set(`${row.userId}:${row.clubId}`, row);
  }
  await prisma.membership.createMany({ data: [...membershipByKey.values()] });

  for (const [index, event] of seedEvents.entries()) {
    const club = seedClubs.find((c) => c.slug === event.clubSlug) ?? seedClubs[0];
    await prisma.event.create({
      data: {
        id: event.id,
        slug: event.slug,
        title: event.title,
        clubId: club.id,
        date: new Date(event.isoDate),
        time: event.time,
        venue: event.venue,
        status: event.status,
        capacity: event.capacity,
        going: event.going,
        cover: event.cover,
        photo: event.photo ?? null,
        tags: event.tags,
        description: event.description,
        approval: mapApproval(event.approval),
        createdAt: new Date(Date.now() - index * 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
      },
    });
  }

  for (const [index, announcement] of seedAnnouncements.entries()) {
    const club = seedClubs.find((c) => c.slug === announcement.clubSlug) ?? seedClubs[0];
    await prisma.announcement.create({
      data: {
        id: announcement.id,
        title: announcement.title,
        body: announcement.body,
        clubId: club.id,
        authorId: "u1",
        pinned: Boolean(announcement.pinned),
        audience: announcement.audience ?? "All",
        priority: "Med",
        createdAt: new Date(Date.now() - (index + 1) * 3 * 60 * 60 * 1000),
      },
    });
  }

  for (const [index, issue] of seedIssues.entries()) {
    const club = issue.clubSlug ? seedClubs.find((c) => c.slug === issue.clubSlug) : seedClubs[0];
    const raisedByUser =
      issue.raisedBy === "You"
        ? users[0]
        : (users.find((u) => u.name === issue.raisedBy) ?? users[index % users.length]);
    await prisma.issue.create({
      data: {
        id: issue.id,
        title: issue.title,
        category: issue.category,
        status: mapIssueStatus(issue.status),
        raisedById: raisedByUser.id,
        clubId: club?.id ?? null,
        priority: issue.priority,
        attachments: issue.attachments ?? [],
        createdAt: new Date(Date.now() - (index + 1) * 6 * 60 * 60 * 1000),
      },
    });
  }

  // Issues without an explicit club still need one for admin dashboards (club-scoped).
  await prisma.issue.updateMany({ where: { clubId: null }, data: { clubId: "c1" } });

  for (const [index, task] of seedTasks.entries()) {
    const event =
      seedEvents.find((e) => e.title.includes(task.event.replace("Cook-Off #41", "Cook-Off"))) ??
      seedEvents[index % seedEvents.length];
    const assignee =
      task.assignee === "You"
        ? users[0]
        : (users.find((u) => u.name === task.assignee) ?? users[index % users.length]);
    await prisma.task.create({
      data: {
        id: task.id,
        title: task.title,
        eventId: event.id,
        role: task.role,
        dueAt: task.dueAt ? new Date(task.dueAt) : new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
        status: task.status,
        priority: task.priority,
        assigneeId: assignee.id,
      },
    });
  }

  for (const [index, entry] of seedContributions.entries()) {
    const event = seedEvents.find((e) => e.title.includes(entry.event)) ?? seedEvents[index % seedEvents.length];
    const user = entry.assignee === "You" ? users[0] : (users.find((u) => u.name === entry.assignee) ?? users[0]);
    await prisma.contribution.create({
      data: {
        id: entry.id,
        userId: user.id,
        eventId: event.id,
        role: entry.role,
        hoursLogged: entry.hoursLogged,
        verifiedAt: new Date(entry.date),
      },
    });
  }

  const countMeInPool = users.filter((user) => !user.isFaculty && !["u1", "u2", "u3"].includes(user.id));
  for (const event of seedEvents) {
    const n = Math.min(event.going, 8);
    for (let index = 0; index < n; index += 1) {
      const user = countMeInPool[index % countMeInPool.length];
      await prisma.countMeIn.create({
        data: {
          id: `${event.id}-countmein-${index}`,
          eventId: event.id,
          userId: user.id,
          checkedIn: false,
          createdAt: new Date(Date.now() - index * 18 * 60 * 60 * 1000),
        },
      });
    }
  }

  await prisma.venue.createMany({
    data: seedResources
      .filter((resource) => resource.type === "Venue")
      .map(({ id, name, capacity, availability }) => ({ id, name, capacity, availability })),
  });

  await prisma.equipment.createMany({
    data: seedResources
      .filter((resource) => resource.type === "Equipment")
      .map(({ id, name, capacity, availability }) => ({
        id,
        name,
        quantity: capacity,
        availability,
      })),
  });

  for (const entry of transparencyLog) {
    const club =
      seedClubs.find((c) => entry.club.includes(c.name.split(" ")[0])) ?? seedClubs[0];
    await prisma.transparencyLogEntry.create({
      data: {
        id: entry.id,
        eventName: entry.event,
        outcome: entry.outcome,
        date: entry.date,
        clubId: club.id,
        spend: entry.spend,
        attendance: entry.attendance,
      },
    });
  }

  // Team test accounts — one per app role (emails/roll from team roster).
  // Password pattern: FirstName@2026
  const teamAccounts = [
    {
      id: "u-alok",
      name: "Alok Kumar Tripathi",
      email: "23f3003225@ds.study.iitm.ac.in",
      rollNumber: "23f3003225",
      password: "Alok@2026",
      isFaculty: true,
      membership: null as null | { clubId: string; role: "Admin" | "Volunteer" | "Coordinator" | "Member" },
    },
    {
      id: "u-vishal",
      name: "Vishal Singh Baraiya",
      email: "23f2005593@ds.study.iitm.ac.in",
      rollNumber: "23f2005593",
      password: "Vishal@2026",
      isFaculty: false,
      membership: { clubId: "c1", role: "Admin" as const },
    },
    {
      id: "u-pardhiv",
      name: "Pardhiv Nukasani",
      email: "23f3004115@ds.study.iitm.ac.in",
      rollNumber: "23f3004115",
      password: "Pardhiv@2026",
      isFaculty: false,
      membership: { clubId: "c3", role: "Volunteer" as const },
    },
    {
      id: "u-purnendu",
      name: "Purnendu Shukla",
      email: "22f2000147@ds.study.iitm.ac.in",
      rollNumber: "22f2000147",
      password: "Purnendu@2026",
      isFaculty: false,
      membership: { clubId: "c6", role: "Coordinator" as const },
    },
    {
      id: "u-yalla",
      name: "Yalla Ashish Chandra Reddy",
      email: "23f3003728@ds.study.iitm.ac.in",
      rollNumber: "23f3003728",
      password: "Ashish@2026",
      isFaculty: false,
      membership: { clubId: "c2", role: "Member" as const },
    },
  ];

  for (const account of teamAccounts) {
    const hashedPassword = await bcrypt.hash(account.password, 10);
    await prisma.user.create({
      data: {
        id: account.id,
        name: account.name,
        email: account.email,
        rollNumber: account.rollNumber,
        hashedPassword,
        isFaculty: account.isFaculty,
        interests: "[]",
      },
    });
    if (account.membership) {
      await prisma.membership.create({
        data: {
          id: `team-${account.id}`,
          userId: account.id,
          clubId: account.membership.clubId,
          role: account.membership.role,
          status: "Active",
          joinedAt: new Date("2024-08-01"),
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("Demo login: 23s1000123@ds.study.iitm.ac.in / sangam");
  console.log("Team role logins (password = FirstName@2026):");
  for (const account of teamAccounts) {
    const roleLabel = account.isFaculty ? "Faculty" : account.membership!.role;
    console.log(`  ${roleLabel.padEnd(12)} ${account.email} / ${account.password}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
