import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import {
  clubs, events, announcements, issues, tasks, members, resources, transparencyLog,
} from "../lib/seed-data";
import { serializeEventTags } from "../lib/event-tags";

const prisma = new PrismaClient();

const DEV_PASSWORD = "password123";

// Mock members reference clubs by display name (e.g. "CodeChef"), while
// clubs.ts uses full names (e.g. "CodeChef IITM BS"). Map the short forms
// used in seed-data.ts's `members[].clubs` to real club slugs.
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

// Parses seed-data.ts's display dates ("Aug 2023") into real Dates, so seeded
// users/memberships show their intended join date instead of "whenever the
// seed script happened to run" (Prisma's createdAt/joinedAt default to now()).
function parseMonthYear(display: string): Date {
  return new Date(`1 ${display}`);
}

async function main() {
  console.log("Seeding clubs...");
  const clubBySlug = new Map<string, { id: string }>();
  for (const c of clubs) {
    const club = await prisma.club.create({
      data: {
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        category: c.category,
        active: c.active,
        hue: c.hue,
        emoji: c.emoji,
        founded: c.founded,
        description: c.description,
      },
    });
    clubBySlug.set(c.slug, club);
  }

  console.log("Seeding users (from mock members)...");
  const hashedPassword = await bcrypt.hash(DEV_PASSWORD, 10);
  const userByName = new Map<string, { id: string }>();
  for (const m of members) {
    const email = `${m.roll}@ds.study.iitm.ac.in`;
    const joinedAt = parseMonthYear(m.joined);
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name: m.name,
        rollNumber: m.roll,
        createdAt: joinedAt,
      },
    });
    userByName.set(m.name, user);

    for (const shortClub of m.clubs) {
      const slug = clubNameToSlug[shortClub];
      const club = slug ? clubBySlug.get(slug) : undefined;
      if (!club) continue;
      await prisma.membership.create({
        data: {
          userId: user.id,
          clubId: club.id,
          role: m.role,
          status: m.status,
          joinedAt,
        },
      });
    }
  }

  // Faculty mentor account — not present in mock members, needed for the
  // faculty persona (institution-wide, not club-scoped).
  const faculty = await prisma.user.create({
    data: {
      email: "faculty.mentor@ds.study.iitm.ac.in",
      hashedPassword,
      name: "Prof. R. Krishnan",
      isFaculty: true,
    },
  });

  console.log("Seeding events...");
  const eventBySlug = new Map<string, { id: string }>();
  const eventByTitle = new Map<string, { id: string }>();
  for (const e of events) {
    const club = clubBySlug.get(e.clubSlug);
    if (!club) continue;
    const event = await prisma.event.create({
      data: {
        slug: e.slug,
        title: e.title,
        clubId: club.id,
        date: new Date(e.isoDate),
        time: e.time,
        venue: e.venue,
        status: e.status,
        capacity: e.capacity,
        cover: e.cover,
        tags: serializeEventTags(e.tags) as Prisma.EventCreateInput["tags"],
        description: e.description,
        approval: e.approval === "not-required" ? "notRequired" : e.approval,
      },
    });
    eventBySlug.set(e.slug, event);
    eventByTitle.set(e.title, event);
  }

  console.log("Seeding announcements...");
  const anyUser = [...userByName.values()][0];
  for (const a of announcements) {
    const club = clubBySlug.get(a.clubSlug);
    if (!club) continue;
    await prisma.announcement.create({
      data: {
        title: a.title,
        body: a.body,
        clubId: club.id,
        authorId: anyUser.id,
        pinned: a.pinned ?? false,
      },
    });
  }

  console.log("Seeding issues...");
  for (const i of issues) {
    const raiser = userByName.get(i.raisedBy) ?? anyUser;
    const club = i.clubSlug ? clubBySlug.get(i.clubSlug) : undefined;
    await prisma.issue.create({
      data: {
        title: i.title,
        category: i.category,
        status: i.status === "In progress" ? "InProgress" : i.status,
        raisedById: raiser.id,
        clubId: club?.id,
        priority: i.priority,
      },
    });
  }

  console.log("Seeding tasks...");
  for (const t of tasks) {
    const event = eventByTitle.get(t.event) ?? [...eventBySlug.values()][0];
    const assignee = userByName.get(t.assignee) ?? anyUser;
    if (!event) continue;
    await prisma.task.create({
      data: {
        title: t.title,
        eventId: event.id,
        role: t.role,
        status: t.status,
        assigneeId: assignee.id,
      },
    });
  }

  console.log("Seeding venues and equipment...");
  for (const r of resources) {
    if (r.type === "Venue") {
      await prisma.venue.create({
        data: { name: r.name, capacity: r.capacity, availability: r.availability },
      });
    } else {
      await prisma.equipment.create({
        data: { name: r.name, quantity: r.capacity, availability: r.availability },
      });
    }
  }

  console.log("Seeding transparency log...");
  for (const l of transparencyLog) {
    // Historical entries (e.g. "Ignite 2025") often predate the current Event rows
    // (e.g. "Ignite 2026") — link by id when a match exists, otherwise keep eventName only.
    const event = eventByTitle.get(l.event);
    const clubMatch = clubs.find(c => c.name.includes(l.club) || l.club.includes(c.name.split(" ")[0]));
    const clubRow = clubMatch ? clubBySlug.get(clubMatch.slug) : undefined;
    if (!clubRow) continue;
    await prisma.transparencyLogEntry.create({
      data: {
        eventName: l.event,
        eventId: event?.id,
        outcome: l.outcome,
        date: l.date,
        clubId: clubRow.id,
        spend: l.spend,
        attendance: l.attendance,
      },
    });
  }

  console.log(`Done. Dev login password for all seeded users: "${DEV_PASSWORD}"`);
  console.log(`Faculty login: ${faculty.email} / ${DEV_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
