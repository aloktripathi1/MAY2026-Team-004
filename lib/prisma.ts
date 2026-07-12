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
} from "@/lib/seed-data";

type AnyRecord = Record<string, any>;

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

// Builds the in-memory dataset once. Next.js dev mode compiles Server Actions
// and Server Components into separate route bundles, each of which evaluates
// its own copy of an imported module — so plain module-scope `const` arrays
// are NOT guaranteed to be the same array instance across a mutation (in a
// Server Action's bundle) and a subsequent read (in a page's bundle). Caching
// the built dataset on `globalThis` (the same pattern the real PrismaClient
// singleton used) forces every bundle to share the exact same object.
function buildMockDb() {
  const clubs = seedClubs.map((club) => ({ ...club }));
  const users = [
    ...seedMembers.map((member) => ({
      id: member.id.replace("m", "u"),
      email: `${member.roll}@ds.study.iitm.ac.in`,
      name: member.name,
      rollNumber: member.roll,
      hashedPassword: "",
      // Demo primary user (Ananya / m1) starts with interests so profile & club
      // recommendations aren't empty until someone opens Edit details.
      interests: member.id === "m1"
        ? JSON.stringify(["Technical", "Design", "Entrepreneurship"])
        : "[]",
      notificationPrefs: "{\"onlyMyClubs\":true,\"suggestedClubEvents\":true,\"pinnedAnnouncementsOnly\":false}",
      isFaculty: false,
      image: undefined as string | undefined,
      createdAt: new Date(`1 ${member.joined}`),
    })),
    {
      id: "u-faculty",
      email: "faculty.mentor@ds.study.iitm.ac.in",
      name: "Prof. R. Krishnan",
      rollNumber: null,
      hashedPassword: "",
      image: undefined as string | undefined,
      interests: "[]",
      notificationPrefs: "{\"onlyMyClubs\":true,\"suggestedClubEvents\":true,\"pinnedAnnouncementsOnly\":false}",
      isFaculty: true,
      createdAt: new Date("2024-01-01"),
    },
  ];

  const memberships = seedMembers.flatMap((member) =>
    member.clubs.map((clubName) => {
      const clubSlug = clubNameToSlug[clubName] ?? clubName.toLowerCase();
      const club = clubs.find((c) => c.slug === clubSlug) ?? clubs[0];
      return {
        id: `${member.id}-${club.slug}`,
        userId: member.id.replace("m", "u"),
        clubId: club.id,
        role: member.role,
        status: member.status,
        joinedAt: new Date(`1 ${member.joined}`),
        user: users.find((u) => u.id === member.id.replace("m", "u"))!,
        club,
      };
    }),
  );

  const events = seedEvents.map((event, index) => {
    const club = clubs.find((c) => c.slug === event.clubSlug) ?? clubs[0];
    return {
      ...event,
      clubId: club.id,
      date: new Date(event.isoDate),
      createdAt: new Date(Date.now() - index * 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
      club,
    };
  });

  const announcements = seedAnnouncements.map((announcement, index) => {
    const club = clubs.find((c) => c.slug === announcement.clubSlug) ?? clubs[0];
    return {
      ...announcement,
      clubId: club.id,
      authorId: users[0].id,
      createdAt: new Date(Date.now() - (index + 1) * 3 * 60 * 60 * 1000),
      club,
      author: users[0],
    };
  });

  const issues = seedIssues.map((issue, index) => {
    const club = issue.clubSlug ? clubs.find((c) => c.slug === issue.clubSlug) : clubs[0];
    const raisedByUser = issue.raisedBy === "You" ? users[0] : (users.find((u) => u.name === issue.raisedBy) ?? users[index % users.length]);
    return {
      ...issue,
      status: issue.status === "In progress" ? "InProgress" : issue.status,
      raisedById: raisedByUser.id,
      clubId: club?.id,
      createdAt: new Date(Date.now() - (index + 1) * 6 * 60 * 60 * 1000),
      // Matches the real Prisma relation name (`raisedBy`) used throughout the app —
      // it was previously exposed as `.raisedByUser`, which every `i.raisedBy.name`
      // read silently resolved to `undefined`.
      raisedBy: raisedByUser,
      club,
      assigneeId: undefined as string | undefined,
      assignee: undefined as (typeof users)[number] | undefined,
    };
  });

  const tasks = seedTasks.map((task, index) => {
    const event = events.find((e) => e.title.includes(task.event.replace("Cook-Off #41", "Cook-Off"))) ?? events[index % events.length];
    const assignee = task.assignee === "You" ? users[0] : (users.find((u) => u.name === task.assignee) ?? users[index % users.length]);
    return {
      ...task,
      eventId: event.id,
      assigneeId: assignee.id,
      dueAt: task.dueAt ? new Date(task.dueAt) : new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
      priority: task.priority ?? "Med",
      event,
      assignee,
    };
  });

  const contributions = seedContributions.map((entry, index) => {
    const event = events.find((e) => e.title.includes(entry.event)) ?? events[index % events.length];
    const user = entry.assignee === "You" ? users[0] : (users.find((u) => u.name === entry.assignee) ?? users[0]);
    return {
      id: entry.id,
      userId: user.id,
      eventId: event.id,
      role: entry.role,
      hoursLogged: entry.hoursLogged,
      verifiedAt: new Date(entry.date),
      user,
      event,
    };
  });

  // Pad attendance counts with filler members only. Skip the demo personas
  // (Ananya u1, Kabir u2, Ishita u3) so role dashboards open with Register,
  // not Requested, unless the signed-in user clicks Register themselves.
  const rsvpPool = users.filter((user) => !user.isFaculty && !["u1", "u2", "u3"].includes(user.id));
  const rsvps = events.flatMap((event) =>
    Array.from({ length: Math.min(event.going, 8) }, (_, index) => {
      const user = rsvpPool[index % rsvpPool.length];
      return {
        id: `${event.id}-rsvp-${index}`,
        eventId: event.id,
        userId: user.id,
        checkedIn: false,
        createdAt: new Date(Date.now() - index * 18 * 60 * 60 * 1000),
        user,
        event,
      };
    }),
  );

  const venues = seedResources
    .filter((resource) => resource.type === "Venue")
    .map(({ id, name, capacity, availability }) => ({ id, name, capacity, availability }));
  // Real Equipment rows use `quantity`, not `capacity` — seed-data.ts's flat
  // Resource shape (shared with Venue) only has `capacity`, so remap it here.
  const equipment = seedResources
    .filter((resource) => resource.type === "Equipment")
    .map(({ id, name, capacity, availability }) => ({ id, name, quantity: capacity, availability }));
  const logs = transparencyLog.map((entry) => ({
    ...entry,
    eventName: entry.event,
    clubId: clubs.find((club) => entry.club.includes(club.name.split(" ")[0]))?.id ?? clubs[0].id,
  }));

  return { clubs, users, memberships, events, announcements, issues, tasks, contributions, rsvps, venues, equipment, logs };
}

const MOCK_DB_VERSION = 3;
const globalForMockDb = globalThis as unknown as {
  __sangamMockDb?: ReturnType<typeof buildMockDb>;
  __sangamMockDbVersion?: number;
};
if (globalForMockDb.__sangamMockDbVersion !== MOCK_DB_VERSION) {
  globalForMockDb.__sangamMockDb = buildMockDb();
  globalForMockDb.__sangamMockDbVersion = MOCK_DB_VERSION;
}
const db = globalForMockDb.__sangamMockDb!;
const { clubs, users, memberships, events, announcements, issues, tasks, contributions, rsvps, venues, equipment, logs } = db;

let mockIdCounter = 0;
function nextMockId(prefix: string): string {
  mockIdCounter += 1;
  return `mock-${prefix}-${Date.now()}-${mockIdCounter}`;
}

function matchesWhere(item: AnyRecord, where?: AnyRecord): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, expected]) => {
    if (expected && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof Date)) {
      if ("in" in expected) return expected.in.includes(item[key]);
      if ("not" in expected) return item[key] !== expected.not;
      if ("gte" in expected) return new Date(item[key]).getTime() >= new Date(expected.gte).getTime();
      if (key === "event") return matchesWhere(item.event, expected);
      if (key === "club") return matchesWhere(item.club, expected);
      // Compound unique key (e.g. { userId_eventId: { userId, eventId } },
      // { userId_clubId: { userId, clubId } }) — match every sub-field directly
      // against the item rather than against a literal "userId_eventId" property,
      // which never exists on the record.
      return Object.entries(expected).every(([subKey, subVal]) => item[subKey] === subVal);
    }
    return item[key] === expected;
  });
}

function orderItems(items: AnyRecord[], orderBy?: AnyRecord): AnyRecord[] {
  if (!orderBy) return items;
  const [[key, direction]] = Object.entries(orderBy);
  return [...items].sort((a, b) => {
    const av = a[key] instanceof Date ? a[key].getTime() : a[key];
    const bv = b[key] instanceof Date ? b[key].getTime() : b[key];
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * (direction === "desc" ? -1 : 1);
  });
}

function query<T extends AnyRecord>(items: T[], args: AnyRecord = {}): T[] {
  const filtered = items.filter((item) => matchesWhere(item, args.where));
  const ordered = orderItems(filtered, args.orderBy) as T[];
  return typeof args.take === "number" ? ordered.slice(0, args.take) : ordered;
}

// Generic CRUD over an in-memory array. create/update/delete mutate `items` in
// place so that a later findMany/findUnique in the same request (or a later
// request, since this module is a server-side singleton) sees the change —
// previously these returned a plausible-looking object without ever touching
// the array, so every mutation appeared to succeed once and then silently
// reverted on the next read.
function table<T extends AnyRecord>(items: T[], idPrefix = "row") {
  return {
    findMany: async (args?: AnyRecord) => query(items, args),
    count: async (args?: AnyRecord) => query(items, args).length,
    findUnique: async (args?: AnyRecord) => items.find((item) => matchesWhere(item, args?.where)) ?? null,
    findUniqueOrThrow: async (args?: AnyRecord) => {
      const item = items.find((entry) => matchesWhere(entry, args?.where));
      if (!item) throw new Error("Mock record not found");
      return item;
    },
    create: async ({ data }: AnyRecord) => {
      const record = { id: nextMockId(idPrefix), createdAt: new Date(), ...data } as T;
      items.push(record);
      return record;
    },
    update: async ({ where, data }: AnyRecord) => {
      const index = items.findIndex((entry) => matchesWhere(entry, where));
      if (index === -1) throw new Error("Mock record not found");
      items[index] = { ...items[index], ...data };
      return items[index];
    },
    delete: async ({ where }: AnyRecord) => {
      const index = items.findIndex((entry) => matchesWhere(entry, where));
      if (index === -1) return null;
      const [removed] = items.splice(index, 1);
      return removed ?? null;
    },
  };
}

function withEventCount<T extends AnyRecord>(event: T): T & { _count: { rsvps: number } } {
  return { ...event, _count: { rsvps: rsvps.filter((r) => r.eventId === event.id).length } };
}

const eventTable = table(events, "event");
const rsvpTable = table(rsvps, "rsvp");
const announcementTable = table(announcements, "announcement");
const issueTable = table(issues, "issue");

export const prisma = {
  user: {
    ...table(users, "user"),
    findUnique: async (args?: AnyRecord) => {
      const user = users.find((item) => matchesWhere(item, args?.where));
      if (!user) return null;
      return { ...user, memberships: memberships.filter((m) => m.userId === user.id) };
    },
  },
  club: {
    ...table(clubs, "club"),
    findMany: async (args?: AnyRecord) =>
      query(clubs, args).map((club) => ({
        ...club,
        _count: { memberships: memberships.filter((m) => m.clubId === club.id).length },
        events: events
          .filter((e) => e.clubId === club.id)
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 1),
      })),
  },
  membership: table(memberships, "membership"),
  event: {
    ...eventTable,
    findMany: async (args?: AnyRecord) => (await eventTable.findMany(args)).map(withEventCount),
    findUnique: async (args?: AnyRecord) => {
      const event = await eventTable.findUnique(args);
      return event ? withEventCount(event) : null;
    },
    create: async ({ data }: AnyRecord) => {
      const club = clubs.find((c) => c.id === data.clubId);
      const record = { id: nextMockId("event"), createdAt: new Date(), updatedAt: new Date(), ...data, club };
      events.push(record);
      return withEventCount(record);
    },
  },
  announcement: {
    ...announcementTable,
    create: async ({ data }: AnyRecord) => {
      const club = clubs.find((c) => c.id === data.clubId);
      const author = users.find((u) => u.id === data.authorId);
      const record = { id: nextMockId("announcement"), createdAt: new Date(), ...data, club, author };
      announcements.push(record);
      return record;
    },
  },
  issue: {
    ...issueTable,
    create: async ({ data }: AnyRecord) => {
      const club = data.clubId ? clubs.find((c) => c.id === data.clubId) : undefined;
      const raisedBy = users.find((u) => u.id === data.raisedById);
      const record = { id: nextMockId("issue"), createdAt: new Date(), ...data, club, raisedBy };
      issues.push(record);
      return record;
    },
  },
  task: table(tasks, "task"),
  contribution: table(contributions, "contribution"),
  rsvp: {
    ...rsvpTable,
    findUnique: async (args?: AnyRecord) =>
      rsvps.find((rsvp) => {
        const compound = args?.where?.userId_eventId;
        return compound ? rsvp.userId === compound.userId && rsvp.eventId === compound.eventId : matchesWhere(rsvp, args?.where);
      }) ?? null,
    create: async ({ data }: AnyRecord) => {
      const user = users.find((u) => u.id === data.userId);
      const event = events.find((e) => e.id === data.eventId);
      const record = { id: nextMockId("rsvp"), createdAt: new Date(), checkedIn: false, ...data, user, event };
      rsvps.push(record);
      return record;
    },
  },
  venue: table(venues, "venue"),
  equipment: table(equipment, "equipment"),
  transparencyLogEntry: table(logs, "log"),
  $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  $disconnect: async () => undefined,
};
