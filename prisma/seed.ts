import bcrypt from "bcrypt";
import { PrismaClient, type Prisma } from "@prisma/client";
import {
  announcements as seedAnnouncements,
  clubs as seedClubs,
  contributions as seedContributions,
  eventAttendees as seedEventAttendees,
  events as seedEvents,
  faculty as seedFaculty,
  issues as seedIssues,
  members as seedMembers,
  resources as seedResources,
  tasks as seedTasks,
  transparencyLog,
} from "../lib/seed-data.ts";

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;
/** Resolves a days-ago/days-from-now offset against the actual seed run time, every time — see issue #90. */
function fromNow(days: number): Date {
  return new Date(Date.now() + days * DAY_MS);
}
function ago(days: number): Date {
  return fromNow(-days);
}

function mapApproval(approval: string) {
  if (approval === "not-required") return "notRequired" as const;
  return approval as "approved" | "pending" | "rejected";
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

  // ---------- clubs ----------
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
  const clubIdBySlug = new Map(seedClubs.map((c) => [c.slug, c.id]));

  // ---------- bulk members (m1..mN) ----------
  const memberUserId = (memberId: string) => memberId.replace(/^m/, "u");
  await prisma.user.createMany({
    data: seedMembers.map((member) => ({
      id: memberUserId(member.id),
      email: `${member.roll}@ds.study.iitm.ac.in`,
      name: member.name,
      rollNumber: member.roll,
      hashedPassword: passwordHash,
      interests: JSON.stringify(member.interests),
      isFaculty: false,
    })),
  });

  const membershipRows: Prisma.MembershipCreateManyInput[] = seedMembers.flatMap((member) =>
    member.memberships.map((m) => ({
      id: `${member.id}-${m.clubSlug}`,
      userId: memberUserId(member.id),
      clubId: clubIdBySlug.get(m.clubSlug)!,
      role: m.role,
      status: m.status,
      joinedAt: ago(m.joinedDaysAgo),
    })),
  );

  // Demo session (u1) holds three extra roles beyond her own CodeChef Admin
  // seat, for QA persona switching from a single account.
  const demoMemberships: Prisma.MembershipCreateManyInput[] = [
    { id: "demo-u1-e-cell", userId: "u1", clubId: "c6", role: "Coordinator", status: "Active", joinedAt: ago(620) },
    { id: "demo-u1-sarga", userId: "u1", clubId: "c3", role: "Volunteer", status: "Active", joinedAt: ago(620) },
    { id: "demo-u1-paradox", userId: "u1", clubId: "c2", role: "Member", status: "Active", joinedAt: ago(620) },
  ];
  await prisma.membership.createMany({ data: [...membershipRows, ...demoMemberships] });

  // ---------- dedicated faculty (no club membership, isFaculty only) ----------
  await prisma.user.createMany({
    data: seedFaculty.map((f) => ({
      id: `u-${f.id}`,
      email: f.email,
      name: f.name,
      rollNumber: null,
      hashedPassword: passwordHash,
      interests: "[]",
      isFaculty: true,
    })),
  });

  // ---------- events ----------
  await prisma.event.createMany({
    data: seedEvents.map((event, index) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      clubId: clubIdBySlug.get(event.clubSlug)!,
      date: fromNow(event.daysOffset),
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
      createdAt: ago(-event.daysOffset + 30 + index * 0.01),
      updatedAt: ago(Math.max(-event.daysOffset - 1, 0)),
    })),
  });
  const eventIdBySlug = new Map(seedEvents.map((e) => [e.slug, e.id]));

  // ---------- event attendees (CountMeIn) ----------
  await prisma.countMeIn.createMany({
    data: seedEventAttendees.map((a, index) => ({
      id: `countmein-${index + 1}`,
      eventId: eventIdBySlug.get(a.eventSlug)!,
      userId: memberUserId(a.memberId),
      checkedIn: a.checkedIn,
      createdAt: ago(a.registeredDaysAgo),
    })),
  });

  // ---------- announcements ----------
  await prisma.announcement.createMany({
    data: seedAnnouncements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      clubId: clubIdBySlug.get(a.clubSlug)!,
      authorId: "u1",
      pinned: a.pinned,
      audience: a.audience,
      priority: a.priority,
      createdAt: ago(a.daysAgo),
    })),
  });

  // ---------- issues ----------
  await prisma.issue.createMany({
    data: seedIssues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      category: issue.category,
      status: issue.status,
      raisedById: memberUserId(issue.raisedById),
      assigneeId: issue.assigneeId ? memberUserId(issue.assigneeId) : null,
      clubId: issue.clubSlug ? clubIdBySlug.get(issue.clubSlug)! : null,
      priority: issue.priority,
      createdAt: ago(issue.daysAgo),
    })),
  });

  // ---------- tasks ----------
  await prisma.task.createMany({
    data: seedTasks.map((task) => ({
      id: task.id,
      title: task.title,
      eventId: eventIdBySlug.get(task.eventSlug)!,
      role: task.role,
      dueAt: fromNow(task.dueInDays),
      status: task.status,
      priority: task.priority,
      assigneeId: memberUserId(task.assigneeId),
    })),
  });

  // ---------- contributions ----------
  await prisma.contribution.createMany({
    data: seedContributions.map((c) => ({
      id: c.id,
      userId: memberUserId(c.memberId),
      eventId: eventIdBySlug.get(c.eventSlug)!,
      role: c.role,
      hoursLogged: c.hoursLogged,
      verifiedAt: ago(c.verifiedDaysAgo),
    })),
  });

  // ---------- venues & equipment ----------
  await prisma.venue.createMany({
    data: seedResources
      .filter((r) => r.type === "Venue")
      .map(({ id, name, capacity, availability }) => ({ id, name, capacity, availability })),
  });
  await prisma.equipment.createMany({
    data: seedResources
      .filter((r) => r.type === "Equipment")
      .map(({ id, name, capacity, availability }) => ({ id, name, quantity: capacity, availability })),
  });

  // ---------- transparency log (one per past event) ----------
  await prisma.transparencyLogEntry.createMany({
    data: transparencyLog.map((t) => ({
      id: t.id,
      eventName: t.eventName,
      eventId: eventIdBySlug.get(t.eventSlug) ?? null,
      outcome: t.outcome,
      date: ago(t.daysAgo).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      clubId: clubIdBySlug.get(t.clubSlug)!,
      spend: t.spend,
      attendance: t.attendance,
    })),
  });

  // ---------- team test accounts — one per app role (documented in README) ----------
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
          joinedAt: ago(600),
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log(`Clubs: ${seedClubs.length} · Members: ${seedMembers.length + teamAccounts.length + seedFaculty.length} · Events: ${seedEvents.length} · Tasks: ${seedTasks.length} · Announcements: ${seedAnnouncements.length} · Issues: ${seedIssues.length}`);
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
