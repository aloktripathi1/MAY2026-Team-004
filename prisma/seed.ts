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
  const now = new Date();

  // Wipe in FK-safe order so re-seed is idempotent.
  await prisma.emailVerificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.clubRequest.deleteMany();
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

  const passwordHash = await bcrypt.hash("Sangam@2026", 10);

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

  // ---------- fictional roster (m1..m38) ----------
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
      // Seeded accounts are demo logins that nobody can confirm by email, so
      // they ship verified — otherwise REQUIRE_EMAIL_VERIFICATION locks every
      // one of them out (#113 follow-up).
      emailVerified: now,
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
  await prisma.membership.createMany({ data: membershipRows });

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
      emailVerified: now,
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
      authorId: memberUserId(a.authorId),
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

  // ---------- transparency log (one per past flagship event) ----------
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

  // ---------- the team's 5 real accounts — one per app role (documented in README) ----------
  // Password pattern: FirstName@2026. Each is seeded with real, role-appropriate
  // data (not just a bare login) per the seed spec.
  const teamAccounts = [
    {
      id: "u-alok",
      name: "Alok Kumar Tripathi",
      email: "23f3003225@ds.study.iitm.ac.in",
      rollNumber: "23f3003225",
      password: "Alok@2026",
      isFaculty: true,
      memberships: [] as { clubSlug: string; role: "Admin" | "Volunteer" | "Coordinator" | "Member" }[],
    },
    {
      id: "u-vishal",
      name: "Vishal Singh Baraiya",
      email: "23f2005593@ds.study.iitm.ac.in",
      rollNumber: "23f2005593",
      password: "Vishal@2026",
      isFaculty: false,
      // Co-admin of E-Cell alongside Aditya Raghunathan (m1) — realistic for a larger club.
      memberships: [{ clubSlug: "e-cell", role: "Admin" as const }],
    },
    {
      id: "u-pardhiv",
      name: "Pardhiv Nukasani",
      email: "23f3004115@ds.study.iitm.ac.in",
      rollNumber: "23f3004115",
      password: "Pardhiv@2026",
      isFaculty: false,
      memberships: [{ clubSlug: "codechef", role: "Volunteer" as const }],
    },
    {
      id: "u-purnendu",
      name: "Purnendu Shukla",
      email: "22f2000147@ds.study.iitm.ac.in",
      rollNumber: "22f2000147",
      password: "Purnendu@2026",
      isFaculty: false,
      // Arena Chess Club had no dedicated coordinator in the fictional roster — clean assignment.
      memberships: [{ clubSlug: "arena", role: "Coordinator" as const }],
    },
    {
      id: "u-yalla",
      name: "Yalla Ashish Chandra Reddy",
      email: "23f3003728@ds.study.iitm.ac.in",
      rollNumber: "23f3003728",
      password: "Ashish@2026",
      isFaculty: false,
      memberships: [
        { clubSlug: "codechef", role: "Member" as const },
        { clubSlug: "arena", role: "Member" as const },
        { clubSlug: "quill", role: "Member" as const },
      ],
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
        emailVerified: now,
      },
    });
    for (const [index, membership] of account.memberships.entries()) {
      await prisma.membership.create({
        data: {
          id: `team-${account.id}-${membership.clubSlug}`,
          userId: account.id,
          clubId: clubIdBySlug.get(membership.clubSlug)!,
          role: membership.role,
          status: "Active",
          joinedAt: ago(600 - index * 10),
        },
      });
    }
  }

  // ---------- Alok (Faculty) — a pending club request to approve live ----------
  await prisma.clubRequest.create({
    data: {
      id: "cr-vaad-debate-collective",
      name: "Vaad Debate Collective",
      tagline: "A second home for competitive debate, focused on Asians-style.",
      category: "Literary",
      description: "A new debate collective focused on Asian Parliamentary format, complementing Paradox's British Parliamentary focus. Weekly practice rounds, open to all experience levels.",
      emoji: "◈",
      status: "Pending",
      requestedById: memberUserId("m35"), // Manish Goyal
      createdAt: ago(2),
      updatedAt: ago(2),
    },
  });

  // ---------- Pardhiv (Volunteer) — cross-club task load, one deliberately overdue ----------
  const pardhivTaskDefs = [
    { id: "team-task-pardhiv-1", title: "Sound check and mic setup", eventSlug: "fusion-night-vi-sarga-live-sarga", role: "Tech ops", status: "todo" as const, priority: "Med" as const, dueInDays: 3 },
    { id: "team-task-pardhiv-2", title: "Judge briefing document", eventSlug: "hack-a-sangam-24h-codechef", role: "Coordination", status: "done" as const, priority: "Med" as const, dueInDays: -18 },
    { id: "team-task-pardhiv-3", title: "Sponsor booth coordination", eventSlug: "ignite-2026-startup-weekend-e-cell", role: "Coordination", status: "doing" as const, priority: "High" as const, dueInDays: 3 },
    { id: "team-task-pardhiv-4", title: "Registration desk", eventSlug: "ignite-2026-startup-weekend-e-cell", role: "Logistics", status: "todo" as const, priority: "High" as const, dueInDays: -2 },
  ];
  for (const def of pardhivTaskDefs) {
    await prisma.task.create({
      data: {
        id: def.id,
        title: def.title,
        eventId: eventIdBySlug.get(def.eventSlug)!,
        role: def.role,
        dueAt: fromNow(def.dueInDays),
        status: def.status,
        priority: def.priority,
        assigneeId: "u-pardhiv",
      },
    });
  }
  await prisma.contribution.create({
    data: {
      id: "team-contribution-pardhiv-1",
      userId: "u-pardhiv",
      eventId: eventIdBySlug.get("hack-a-sangam-24h-codechef")!,
      role: "Coordination",
      hoursLogged: 7.5,
      verifiedAt: ago(16),
    },
  });

  // ---------- Purnendu (Coordinator, Arena) — open tasks ready to hand off to volunteers ----------
  const purnenduTaskDefs = [
    { id: "team-task-purnendu-1", title: "Board setup", eventSlug: "bullet-chess-night-arena", role: "Logistics", status: "todo" as const, priority: "Med" as const, dueInDays: 5, assigneeId: memberUserId("m17") }, // Siddharth Bose
    { id: "team-task-purnendu-2", title: "Pairing sheet printing", eventSlug: "bullet-chess-night-arena", role: "Logistics", status: "todo" as const, priority: "Low" as const, dueInDays: 4, assigneeId: memberUserId("m17") },
    { id: "team-task-purnendu-3", title: "Arbiter coordination", eventSlug: "rating-ladder-round-5-arena", role: "Coordination", status: "todo" as const, priority: "Med" as const, dueInDays: 17, assigneeId: memberUserId("m11") }, // Rohan Kulkarni
  ];
  for (const def of purnenduTaskDefs) {
    await prisma.task.create({
      data: {
        id: def.id,
        title: def.title,
        eventId: eventIdBySlug.get(def.eventSlug)!,
        role: def.role,
        dueAt: fromNow(def.dueInDays),
        status: def.status,
        priority: def.priority,
        assigneeId: def.assigneeId,
      },
    });
  }

  // ---------- Yalla (Member) — registrations and one submitted issue ----------
  await prisma.countMeIn.createMany({
    data: [
      { id: "team-countmein-yalla-1", eventId: eventIdBySlug.get("weekly-cook-off-48-codechef")!, userId: "u-yalla", checkedIn: false, createdAt: ago(1) },
      { id: "team-countmein-yalla-2", eventId: eventIdBySlug.get("bullet-chess-night-arena")!, userId: "u-yalla", checkedIn: false, createdAt: ago(2) },
    ],
  });
  await prisma.issue.create({
    data: {
      id: "team-issue-yalla-1",
      title: "Certificate not generated after event",
      category: "Other",
      status: "InProgress",
      raisedById: "u-yalla",
      clubId: clubIdBySlug.get("codechef")!,
      priority: "Med",
      createdAt: ago(6),
    },
  });

  console.log("Seed complete.");
  console.log(`Clubs: ${seedClubs.length} · Members: ${seedMembers.length + teamAccounts.length + seedFaculty.length} · Events: ${seedEvents.length} · Tasks: ${seedTasks.length + pardhivTaskDefs.length + purnenduTaskDefs.length} · Announcements: ${seedAnnouncements.length} · Issues: ${seedIssues.length + 1}`);
  console.log("Team role logins (password = FirstName@2026):");
  for (const account of teamAccounts) {
    const roleLabel = account.isFaculty ? "Faculty" : account.memberships[0]?.role ?? "Member";
    console.log(`  ${roleLabel.padEnd(12)} ${account.email} / ${account.password}`);
  }
  console.log("Fictional roster login password (all 38 + 2 faculty): Sangam@2026");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
