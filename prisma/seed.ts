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
        emailVerified: now,
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

  // ---------- personal data for the 5 documented demo accounts ----------
  // The loop above only gives each team account a bare membership row — real
  // demo/QA logins need their own tasks, issues, contributions, and
  // announcements too, not just a seat borrowed from the generic bulk
  // dataset (which never references these account ids at all).
  const sargaEvents = await prisma.event.findMany({ where: { clubId: "c3" }, orderBy: { date: "asc" } });
  const eCellEvents = await prisma.event.findMany({ where: { clubId: "c6" }, orderBy: { date: "asc" } });

  const pardhivTaskDefs = [
    { title: "Confirm PA system booking", role: "Logistics", status: "todo" as const, priority: "High" as const, dueInDays: 2 },
    { title: "Brief new volunteers on setup", role: "Coordination", status: "todo" as const, priority: "Med" as const, dueInDays: 4 },
    { title: "Test mic levels before soundcheck", role: "Tech ops", status: "doing" as const, priority: "Med" as const, dueInDays: 1 },
    { title: "Post rehearsal recap on Discord", role: "Content", status: "done" as const, priority: "Low" as const, dueInDays: -3 },
    { title: "Arrange green-room snacks", role: "Hospitality", status: "done" as const, priority: "Low" as const, dueInDays: -10 },
  ];
  for (const [index, def] of pardhivTaskDefs.entries()) {
    const event = sargaEvents[index % Math.max(sargaEvents.length, 1)];
    if (!event) continue;
    await prisma.task.create({
      data: {
        id: `team-task-pardhiv-${index + 1}`,
        title: def.title,
        eventId: event.id,
        role: def.role,
        dueAt: fromNow(def.dueInDays),
        status: def.status,
        priority: def.priority,
        assigneeId: "u-pardhiv",
      },
    });
  }

  const purnenduTaskDefs = [
    { title: "Confirm sponsor booth setup", role: "Logistics", status: "todo" as const, priority: "High" as const, dueInDays: 3 },
    { title: "Brief judges on scoring rubric", role: "Coordination", status: "todo" as const, priority: "High" as const, dueInDays: 5 },
    { title: "Finalize mentor slot roster", role: "Coordination", status: "doing" as const, priority: "Med" as const, dueInDays: 2 },
    { title: "Draft post-event survey", role: "Content", status: "todo" as const, priority: "Low" as const, dueInDays: 8 },
    { title: "Confirm venue booking with facilities", role: "Logistics", status: "done" as const, priority: "Med" as const, dueInDays: -6 },
  ];
  for (const [index, def] of purnenduTaskDefs.entries()) {
    const event = eCellEvents[index % Math.max(eCellEvents.length, 1)];
    if (!event) continue;
    await prisma.task.create({
      data: {
        id: `team-task-purnendu-${index + 1}`,
        title: def.title,
        eventId: event.id,
        role: def.role,
        dueAt: fromNow(def.dueInDays),
        status: def.status,
        priority: def.priority,
        assigneeId: "u-purnendu",
      },
    });
  }

  // A few verified volunteer hours for Pardhiv on past Sarga events.
  const pastSargaEvents = sargaEvents.filter((e) => e.status === "past");
  const pardhivContributionDefs = [
    { role: "Volunteer crew", hoursLogged: 6.5 },
    { role: "Tech ops", hoursLogged: 4.0 },
    { role: "Hospitality", hoursLogged: 3.5 },
  ];
  for (const [index, def] of pardhivContributionDefs.entries()) {
    const event = pastSargaEvents[index % Math.max(pastSargaEvents.length, 1)];
    if (!event) continue;
    await prisma.contribution.create({
      data: {
        id: `team-contribution-pardhiv-${index + 1}`,
        userId: "u-pardhiv",
        eventId: event.id,
        role: def.role,
        hoursLogged: def.hoursLogged,
        verifiedAt: ago(10 + index * 15),
      },
    });
  }

  // Yalla (Paradox member) raising real, varied-status issues.
  const yallaIssueDefs = [
    { title: "Can't count myself in - button loops", category: "Registration" as const, status: "Open" as const, priority: "Med" as const, daysAgo: 3, assigneeId: undefined as string | undefined },
    { title: "Waitlist position not updating", category: "Registration" as const, status: "InProgress" as const, priority: "Low" as const, daysAgo: 9, assigneeId: "u-vishal" },
    { title: "Club page shows outdated tagline", category: "Other" as const, status: "Resolved" as const, priority: "Low" as const, daysAgo: 20, assigneeId: undefined as string | undefined },
  ];
  for (const [index, def] of yallaIssueDefs.entries()) {
    await prisma.issue.create({
      data: {
        id: `team-issue-yalla-${index + 1}`,
        title: def.title,
        category: def.category,
        status: def.status,
        raisedById: "u-yalla",
        assigneeId: def.assigneeId ?? null,
        clubId: "c2",
        priority: def.priority,
        createdAt: ago(def.daysAgo),
      },
    });
  }

  // Announcements authored by the admin and coordinator team accounts themselves.
  const vishalAnnouncementDefs = [
    { title: "Regionals onsite squad meeting Friday", body: "Mandatory meeting for everyone on the regionals travel squad — logistics and jersey sizing.", pinned: true, daysAgo: 2 },
    { title: "New judging panel for internal contests", body: "Rotating in two new problem-setters this month — expect fresh problem styles.", pinned: false, daysAgo: 8 },
  ];
  for (const [index, def] of vishalAnnouncementDefs.entries()) {
    await prisma.announcement.create({
      data: {
        id: `team-announcement-vishal-${index + 1}`,
        title: def.title,
        body: def.body,
        clubId: "c1",
        authorId: "u-vishal",
        pinned: def.pinned,
        audience: "All",
        priority: "Med",
        createdAt: ago(def.daysAgo),
      },
    });
  }

  const purnenduAnnouncementDefs = [
    { title: "Ignite venue change confirmed", body: "Startup weekend moves to the Amphitheatre — same dates, bigger room.", pinned: true, daysAgo: 4 },
    { title: "Coordinator office hours this week", body: "Drop by the E-Cell lounge Wednesday if you need help with your pitch deck.", pinned: false, daysAgo: 11 },
  ];
  for (const [index, def] of purnenduAnnouncementDefs.entries()) {
    await prisma.announcement.create({
      data: {
        id: `team-announcement-purnendu-${index + 1}`,
        title: def.title,
        body: def.body,
        clubId: "c6",
        authorId: "u-purnendu",
        pinned: def.pinned,
        audience: "All",
        priority: "Med",
        createdAt: ago(def.daysAgo),
      },
    });
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
