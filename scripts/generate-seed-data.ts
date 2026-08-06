/**
 * One-off generator: produces lib/seed-data.ts from scratch with enough
 * volume and variety to populate every dashboard for a presentation demo.
 * Not part of the running app — run with `npx tsx scripts/generate-seed-data.ts`
 * whenever the dataset needs regenerating. Deterministic (seeded RNG) so
 * re-runs are diffable.
 *
 * Design notes:
 * - c1-c8 keep their existing id/slug/name so the documented demo + team
 *   accounts (prisma/seed.ts, README, tests/integration/helpers.ts) keep
 *   working unmodified. c9/c10 are new.
 * - m1 (Ananya Rao / u1) keeps her existing shape; prisma/seed.ts's
 *   demoMemberships block still layers her extra QA-switcher roles on top.
 * - All dates are stored as *offsets* (daysAgo / daysFromNow), not fixed
 *   calendar dates, so the dataset never "expires" — prisma/seed.ts resolves
 *   them against Date.now() at seed time, every time.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

// ---------- seeded RNG (mulberry32) ----------
function mulberry32(seed: number) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(90210);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)];
const sample = <T,>(arr: readonly T[], n: number): T[] => {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    out.push(pool.splice(randInt(0, pool.length - 1), 1)[0]);
  }
  return out;
};
const weighted = <T,>(entries: [T, number][]): T => {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) {
    if (r < w) return value;
    r -= w;
  }
  return entries[entries.length - 1][0];
};

// ---------- name pools ----------
const FIRST_NAMES = [
  "Aadhya", "Aarav", "Aarohi", "Aditi", "Advait", "Akshara", "Amrita", "Anagha", "Ananya", "Anika",
  "Anirudh", "Anjali", "Ansh", "Arjun", "Aryan", "Avni", "Bhavya", "Chaitanya", "Darshan", "Deepika",
  "Devansh", "Diya", "Esha", "Gaurav", "Harshita", "Ishaan", "Ishita", "Jahnavi", "Kabir", "Kavya",
  "Krishna", "Lakshya", "Lavanya", "Manav", "Manasi", "Meera", "Mihir", "Naina", "Nikhil", "Nishka",
  "Om", "Pallavi", "Parth", "Pranav", "Priya", "Radhika", "Raghav", "Rahul", "Rhea", "Riya",
  "Rohan", "Rudra", "Sahana", "Sai", "Samar", "Sanjana", "Saanvi", "Shaurya", "Shreya", "Siddharth",
  "Sneha", "Soham", "Tanvi", "Tanya", "Tarun", "Trisha", "Uday", "Vaibhav", "Vanya", "Varun",
  "Vedant", "Vidhi", "Vihaan", "Vivaan", "Yash", "Zara",
];
const LAST_NAMES = [
  "Agarwal", "Bhatt", "Chandran", "Desai", "Gupta", "Hegde", "Iyer", "Jain", "Kapoor", "Krishnan",
  "Kulkarni", "Malhotra", "Menon", "Nair", "Pillai", "Patel", "Rao", "Reddy", "Saxena", "Sen",
  "Sharma", "Shetty", "Singh", "Subramanian", "Varma", "Verma", "Yadav", "Bose", "Chatterjee", "Dutta",
];

// ---------- interest pool (must match lib/interests.ts INTEREST_OPTIONS) ----------
const INTERESTS = ["Technical", "Cultural", "Sports", "Design", "Debate", "Entrepreneurship", "Sustainability", "Writing"] as const;

// ---------- club definitions ----------
type ActivityProfile = "at-risk" | "steady" | "active" | "very-active";

interface ClubDef {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  hue: string;
  emoji: string;
  founded: string;
  description: string;
  photo?: string;
  targetMembers: number;
  activity: ActivityProfile;
}

const CLUB_DEFS: ClubDef[] = [
  { id: "c1", slug: "codechef", name: "CodeChef IITM BS", tagline: "Competitive programming, weekly contests.", category: "Technical", hue: "122", emoji: "◉", founded: "2021", description: "Weekly cook-offs, algorithm deep-dives, and interview prep circles. Home for anyone who thinks in edge cases.", photo: "/club-banners/codechef.jpg", targetMembers: 55, activity: "very-active" },
  { id: "c2", slug: "paradox", name: "Paradox - Debate Society", tagline: "Parliamentary debate & MUN circuit.", category: "Literary", hue: "5", emoji: "❋", founded: "2020", description: "British Parliamentary, Asians, and MUN training. Weekly practice rounds. Traveling squad.", photo: "/club-banners/paradox.jpg", targetMembers: 28, activity: "steady" },
  { id: "c3", slug: "sarga", name: "Sarga - Music Circle", tagline: "Fusion, jams, semester showcases.", category: "Cultural", hue: "260", emoji: "♪", founded: "2019", description: "Instrumentalists, vocalists, producers. Open jam every Friday, big fusion show every semester.", photo: "/club-banners/sarga.jpg", targetMembers: 32, activity: "active" },
  { id: "c4", slug: "kalakriti", name: "Kalakriti Design Guild", tagline: "Product, UI, illustration critique.", category: "Design", hue: "85", emoji: "◐", founded: "2022", description: "Portfolio reviews, Figma workshops, brand studies. Cross-pollination with product & marketing.", photo: "/club-banners/kalakriti.jpg", targetMembers: 24, activity: "steady" },
  { id: "c5", slug: "prakriti", name: "Prakriti - Sustainability", tagline: "Campus greening & climate action.", category: "Social", hue: "155", emoji: "❦", founded: "2021", description: "Zero-waste campaigns, tree drives, and climate literacy workshops for local schools.", photo: "/club-banners/prakriti.jpg", targetMembers: 22, activity: "steady" },
  { id: "c6", slug: "e-cell", name: "E-Cell IITM BS", tagline: "Founder circles & startup weekends.", category: "Entrepreneurship", hue: "45", emoji: "◈", founded: "2019", description: "Pitch nights, mentor office hours, and the annual Ignite startup weekend. Alumni founder network.", photo: "/club-banners/e-cell.jpg", targetMembers: 34, activity: "very-active" },
  { id: "c7", slug: "quill", name: "Quill - Writers' Circle", tagline: "Prose, poetry, longform criticism.", category: "Literary", hue: "320", emoji: "✦", founded: "2022", description: "Monthly zine, workshop rounds, and reading nights. Fiction, poetry, essays, all welcome.", photo: "/club-banners/quill.jpg", targetMembers: 20, activity: "at-risk" },
  { id: "c8", slug: "arena", name: "Arena - Chess Club", tagline: "Blitz, bullet, and team leagues.", category: "Sports", hue: "0", emoji: "♞", founded: "2020", description: "Weekly blitz nights, inter-college leagues, opening prep clinics. Beginners always welcome.", photo: "/club-banners/arena.jpg", targetMembers: 24, activity: "steady" },
  { id: "c9", slug: "photon", name: "Photon - Robotics & Electronics", tagline: "Bots, boards, and Saturday build nights.", category: "Technical", hue: "195", emoji: "⚡", founded: "2023", description: "Line-followers to autonomous bots. Weekly build nights, sensor workshops, and an annual hackware showdown.", photo: "/club-banners/photon.jpg", targetMembers: 30, activity: "very-active" },
  { id: "c10", slug: "turf", name: "Turf - Football Club", tagline: "Five-a-side leagues & weekend matches.", category: "Sports", hue: "170", emoji: "⚽", founded: "2022", description: "Weekend five-a-side leagues, fitness drills, and the inter-hostel cup. All skill levels.", photo: "/club-banners/turf.jpg", targetMembers: 22, activity: "steady" },
];
const CLUB_SLUGS = CLUB_DEFS.map((c) => c.slug);
const clubBySlug = (slug: string) => CLUB_DEFS.find((c) => c.slug === slug)!;

function clubGradient(hue: string): string {
  return `linear-gradient(135deg, oklch(0.32 0.09 ${hue}) 0%, oklch(0.15 0.04 ${hue}) 100%)`;
}
function eventGradient(hue: string, spin: number): string {
  const h2 = (parseInt(hue, 10) + spin) % 360;
  return `linear-gradient(135deg, oklch(0.55 0.14 ${hue}) 0%, oklch(0.5 0.16 ${h2}) 100%)`;
}

// ---------- members: club-first allocation ----------
type Role = "Member" | "Volunteer" | "Coordinator" | "Admin";
type MStatus = "Active" | "Pending" | "Inactive";

interface ClubMembership {
  clubSlug: string;
  role: Role;
  status: MStatus;
  joinedDaysAgo: number;
}
interface MemberDef {
  id: string;
  name: string;
  roll: string;
  avatar: string;
  interests: string[];
  memberships: ClubMembership[];
}

const usedNames = new Set<string>();
function uniqueName(): string {
  let name = "";
  do {
    name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  } while (usedNames.has(name));
  usedNames.add(name);
  return name;
}

let rollSeq = 1000;
function nextRoll(): string {
  const year = pick(["21", "22", "23", "24"]);
  rollSeq += randInt(1, 6);
  return `${year}s1${String(rollSeq).padStart(6, "0")}`;
}

function joinedDaysAgoFor(activity: ActivityProfile): number {
  // Active clubs skew toward some very-recent joins (growth signal);
  // the at-risk club skews toward stale joins only (no recent growth).
  switch (activity) {
    case "at-risk":
      return randInt(150, 420);
    case "steady":
      return randInt(20, 300);
    case "active":
      return weighted<number>([[randInt(3, 25), 3], [randInt(26, 250), 7]]);
    case "very-active":
      return weighted<number>([[randInt(1, 20), 4], [randInt(21, 260), 6]]);
  }
}

function statusFor(activity: ActivityProfile): MStatus {
  const r = rand();
  if (activity === "at-risk") {
    if (r < 0.7) return "Active";
    if (r < 0.85) return "Inactive";
    return "Pending";
  }
  if (r < 0.82) return "Active";
  if (r < 0.94) return "Pending";
  return "Inactive";
}

const members: MemberDef[] = [];
// m1 — Ananya Rao / u1, unchanged special-cased demo account.
members.push({
  id: "m1",
  name: "Ananya Rao",
  roll: "23s1000123",
  avatar: "122",
  interests: ["Technical", "Design", "Entrepreneurship"],
  memberships: [{ clubSlug: "codechef", role: "Admin", status: "Active", joinedDaysAgo: 620 }],
});
usedNames.add("Ananya Rao");

// Membership slots to fill per club (excluding m1's CodeChef admin seat and the
// 5 team accounts, which prisma/seed.ts still wires up separately).
const roleQuota = (target: number): [Role, number][] => {
  const admins = 1;
  const coords = Math.max(1, Math.round(target * 0.09));
  const vols = Math.max(2, Math.round(target * 0.28));
  const mems = Math.max(0, target - admins - coords - vols);
  return [["Admin", admins], ["Coordinator", coords], ["Volunteer", vols], ["Member", mems]];
};

// Per-club role slot queues, e.g. codechef: [Admin, Coordinator, Coordinator, Volunteer, ...]
const clubRoleQueues = new Map<string, Role[]>();
for (const club of CLUB_DEFS) {
  const target = club.slug === "codechef" ? club.targetMembers - 1 : club.targetMembers; // m1 already fills 1 seat
  const queue: Role[] = [];
  for (const [role, count] of roleQuota(target)) {
    for (let i = 0; i < count; i += 1) queue.push(role);
  }
  clubRoleQueues.set(club.slug, queue);
}

// "Connector" users deliberately hold multiple clubs (different role each) to
// demonstrate the multi-role system; the rest hold a single club.
const totalSlots = [...clubRoleQueues.values()].reduce((s, q) => s + q.length, 0);
const TARGET_BULK_USERS = 105;
let slotsRemaining = totalSlots;
let usersRemaining = TARGET_BULK_USERS;

for (const club of CLUB_DEFS) {
  const queue = clubRoleQueues.get(club.slug)!;
  for (const role of queue) {
    // Decide whether this slot is filled by a brand-new user or an existing
    // one who doesn't yet belong to this club (multi-role demonstration).
    const reuseCandidates = members.filter(
      (m) => m.id !== "m1" && m.memberships.length < 4 && !m.memberships.some((x) => x.clubSlug === club.slug),
    );
    const avgSlotsPerRemainingUser = usersRemaining > 0 ? slotsRemaining / usersRemaining : 0;
    const shouldReuse = reuseCandidates.length > 0 && (avgSlotsPerRemainingUser < 1.15 || rand() < 0.55);

    let member: MemberDef;
    if (shouldReuse) {
      member = pick(reuseCandidates);
    } else {
      const name = uniqueName();
      member = {
        id: `m${members.length + 1}`,
        name,
        roll: nextRoll(),
        avatar: String(randInt(0, 359)),
        interests: sample(INTERESTS, randInt(1, 3)),
        memberships: [],
      };
      members.push(member);
      usersRemaining -= 1;
    }
    member.memberships.push({
      clubSlug: club.slug,
      role,
      status: statusFor(club.activity),
      joinedDaysAgo: joinedDaysAgoFor(club.activity),
    });
    slotsRemaining -= 1;
  }
}

// ---------- faculty (2 additional, on top of team account Alok) ----------
const facultyDefs = [
  { id: "f1", name: "Prof. R. Krishnan", email: "faculty.mentor@ds.study.iitm.ac.in" },
  { id: "f2", name: "Dr. Meenakshi Subramaniam", email: "meenakshi.subramaniam@ds.study.iitm.ac.in" },
];

// ---------- event content templates per club ----------
interface EventTemplate {
  title: string;
  venue: string;
  tags: string[];
  description: string;
}
const EVENT_TEMPLATES: Record<string, EventTemplate[]> = {
  codechef: [
    { title: "Weekly Cook-Off", venue: "Online · Discord", tags: ["Contest", "Online"], description: "Four problems, two hours, one leaderboard. Editorial released 10 minutes after end." },
    { title: "DSA Deep-Dive: Segment Trees", venue: "Seminar Hall 1", tags: ["Workshop"], description: "From first principles to lazy propagation, with five practice problems to close." },
    { title: "Mock Interview Circle", venue: "Online · Zoom", tags: ["Careers"], description: "Peer-to-peer mock interviews, DSA + system design rounds, feedback forms after." },
    { title: "Hacktoberfest Kickoff", venue: "Common Room", tags: ["Open Source"], description: "First PR walkthrough for newcomers, curated list of beginner-friendly repos." },
    { title: "Speedforces Marathon", venue: "Online · Codeforces", tags: ["Contest", "Online"], description: "Six-hour open marathon, unofficial standings synced to the club leaderboard." },
    { title: "Interview Prep: System Design 101", venue: "Seminar Hall 2", tags: ["Careers", "Workshop"], description: "Load balancers to sharding, with two whiteboard case studies." },
  ],
  paradox: [
    { title: "BP Open Round", venue: "Seminar Hall 3", tags: ["Debate"], description: "British Parliamentary format. Motions announced 15 minutes before each round." },
    { title: "Novice Debate Bootcamp", venue: "Seminar Hall 3", tags: ["Debate", "Workshop"], description: "First-timer friendly. POI drills, case construction, and a mock round." },
    { title: "Asians-Style Practice Night", venue: "Discussion Room B", tags: ["Debate"], description: "Three-round practice in Asian Parliamentary format ahead of the inter-college circuit." },
    { title: "MUN Delegate Prep", venue: "Seminar Hall 1", tags: ["MUN"], description: "Position paper workshop and rules-of-procedure refresher for first-time delegates." },
    { title: "Winter Debate Open", venue: "Amphitheatre", tags: ["Debate", "Flagship"], description: "The club's flagship open, inviting squads from partner campuses." },
  ],
  sarga: [
    { title: "Fusion Night - Sarga Live", venue: "Amphitheatre", tags: ["Music", "Open"], description: "The flagship fusion showcase. Six acts, one hour of chaos, one hour of soul." },
    { title: "Open Jam Friday", venue: "Amphitheatre", tags: ["Music"], description: "Bring an instrument or just your voice. All genres, no auditions." },
    { title: "Acoustic Unplugged", venue: "Courtyard Stage", tags: ["Music"], description: "Stripped-down acoustic sets, string and wind instruments only." },
    { title: "Producer's Circle: Mixing Basics", venue: "Studio A", tags: ["Workshop"], description: "EQ, compression, and a live mixing demo on a track from last semester's showcase." },
    { title: "Battle of the Bands", venue: "Amphitheatre", tags: ["Music", "Competition"], description: "Six campus bands, one trophy, judged by an alumni panel." },
  ],
  kalakriti: [
    { title: "Portfolio Crit Night", venue: "Studio B · Online hybrid", tags: ["Design", "Hybrid"], description: "Bring three screens or one case study. Ten-minute slots, brutally honest, brutally kind." },
    { title: "Figma Workshop: Auto Layout", venue: "Studio B", tags: ["Workshop"], description: "Component variants, auto layout, and a live rebuild of a messy file." },
    { title: "Brand Study: Case Teardown", venue: "Studio A", tags: ["Design"], description: "Group teardown of a recent rebrand, covering typography, voice, and system tokens." },
    { title: "Annual Photo Exhibition", venue: "Gallery Hall", tags: ["Design", "Exhibition"], description: "Semester showcase of member work. Volunteers handle setup, wall labels, and teardown." },
  ],
  prakriti: [
    { title: "Climate Teach-In · Local Schools", venue: "Off-campus · Adyar", tags: ["Volunteer"], description: "Half-day teach-in at two neighborhood schools. Materials provided." },
    { title: "Campus Zero-Waste Drive", venue: "Main Quad", tags: ["Campaign"], description: "Segregation drive and awareness stalls across the main quad." },
    { title: "Tree Plantation Weekend", venue: "Off-campus · Besant Nagar", tags: ["Volunteer"], description: "Native sapling drive in partnership with the city greening board." },
    { title: "Climate Literacy Workshop", venue: "Seminar Hall 2", tags: ["Workshop"], description: "Data-driven session on campus energy use, open to all departments." },
  ],
  "e-cell": [
    { title: "Ignite - Startup Weekend", venue: "IITM Research Park", tags: ["Flagship", "Sponsored"], description: "54 hours. Idea to prototype to pitch. Ten mentors, five judges, one grand prize." },
    { title: "Founder AMA", venue: "Online · Zoom", tags: ["Talk"], description: "Live Q&A with an alumni founder on their seed-to-Series-A journey." },
    { title: "Pitch Practice Night", venue: "Seminar Hall 1", tags: ["Workshop"], description: "Five-minute pitches, structured feedback from mentors and peers." },
    { title: "Mentor Office Hours", venue: "E-Cell Lounge", tags: ["Mentorship"], description: "Drop-in slots with rotating industry mentors, first-come first-served." },
    { title: "Startup Weekend Debrief", venue: "E-Cell Lounge", tags: ["Talk"], description: "Retro on Ignite's outcomes, with two founding teams sharing next steps." },
    { title: "Fundraising 101", venue: "Seminar Hall 2", tags: ["Workshop"], description: "Cap tables, term sheets, and a mock investor Q&A." },
  ],
  quill: [
    { title: "Monthly Zine Workshop", venue: "Library Courtyard", tags: ["Literary", "Workshop"], description: "Open submissions round for next month's zine, editing pairs assigned on the spot." },
    { title: "Reading Night: Short Fiction", venue: "Library Courtyard", tags: ["Literary"], description: "Members read 5-minute original pieces, informal feedback after." },
    { title: "Zine Launch Night", venue: "Library Courtyard", tags: ["Literary", "Open"], description: "Launch of the semester zine, print copies handed out at the door." },
  ],
  arena: [
    { title: "Chess Blitz Night", venue: "Common Room", tags: ["Sports"], description: "Nine rounds, 3+2 time control, live rating updates on the club board." },
    { title: "Opening Prep Clinic", venue: "Common Room", tags: ["Workshop"], description: "Sicilian and Italian repertoire session for club-level players." },
    { title: "Inter-College Chess Meet", venue: "Off-campus · Chennai", tags: ["Sports", "Travel"], description: "Away fixture against three other campuses." },
    { title: "Bullet Chess Friday", venue: "Common Room", tags: ["Sports"], description: "1+0 bullet bracket, knockout format, snacks sponsored by the club." },
  ],
  photon: [
    { title: "Line-Follower Sprint", venue: "Robotics Lab", tags: ["Robotics", "Competition"], description: "Timed trials on the club's standard track, three attempts per team." },
    { title: "Arduino 101 Workshop", venue: "Robotics Lab", tags: ["Workshop"], description: "Sensors, actuators, and a working blink-to-buzzer circuit by the end of the session." },
    { title: "Build Night: Autonomous Bots", venue: "Robotics Lab", tags: ["Robotics"], description: "Open build session, mentors on hand for wiring and firmware debugging." },
    { title: "Hackware Build Night", venue: "Maker Space", tags: ["Hardware"], description: "Overnight build sprint, judged on functioning prototype by morning." },
    { title: "Electronics Swap Meet", venue: "Maker Space", tags: ["Community"], description: "Trade spare components, breadboards, and half-finished projects." },
    { title: "Autonomous Bot Showdown", venue: "Sports Complex Annex", tags: ["Robotics", "Flagship"], description: "The club's flagship competition, open to all campuses." },
  ],
  turf: [
    { title: "Five-a-Side League Night", venue: "Turf Ground", tags: ["Sports"], description: "Round-robin group stage, standings updated live pitch-side." },
    { title: "Inter-Hostel Cup Kickoff", venue: "Turf Ground", tags: ["Sports", "Competition"], description: "Opening matches of the semester's inter-hostel cup." },
    { title: "Fitness & Fundamentals Drill", venue: "Turf Ground", tags: ["Workshop"], description: "Conditioning and first-touch drills, open to all skill levels." },
    { title: "Weekend Friendly Match", venue: "Turf Ground", tags: ["Sports"], description: "Casual weekend fixture against a neighboring campus side." },
  ],
};

const COVERS: Record<string, string> = {
  codechef: "linear-gradient(135deg,#d4ff3a 0%,#22d3ee 100%)",
  paradox: "linear-gradient(135deg,#ff4d8f 0%,#a855f7 100%)",
  sarga: "linear-gradient(135deg,#7c3aed 0%,#ec4899 60%,#f97316 100%)",
  kalakriti: "linear-gradient(135deg,#eab308 0%,#84cc16 100%)",
  prakriti: "linear-gradient(135deg,#22c55e 0%,#0891b2 100%)",
  "e-cell": "linear-gradient(135deg,#fb923c 0%,#f43f5e 100%)",
  quill: "linear-gradient(135deg,#a855f7 0%,#ec4899 100%)",
  arena: "linear-gradient(135deg,#334155 0%,#0f172a 100%)",
  photon: "linear-gradient(135deg,#22d3ee 0%,#6366f1 100%)",
  turf: "linear-gradient(135deg,#16a34a 0%,#0f766e 100%)",
};
const CURATED_PHOTOS: Record<string, string> = {
  "Fusion Night - Sarga Live": "/club-events/fusion-night-vi.png",
  "Weekly Cook-Off": "/club-events/cook-off-42.png",
  "Ignite - Startup Weekend": "/club-events/ignite-2026.png",
  "BP Open Round": "/club-events/bp-open-round.png",
  "Portfolio Crit Night": "/club-events/portfolio-crit.png",
  "Climate Teach-In · Local Schools": "/club-events/climate-teach-in.png",
  "Chess Blitz Night": "/club-events/chess-blitz-x.png",
  "Open Jam Friday": "/club-events/sarga-open-jam.png",
};

type ApprovalDisplay = "approved" | "pending" | "not-required" | "rejected";
interface EventDef {
  id: string;
  slug: string;
  title: string;
  clubSlug: string;
  club: string;
  date: string;
  isoDate: string;
  time: string;
  venue: string;
  status: "upcoming" | "past";
  going: number;
  capacity: number;
  cover: string;
  photo?: string;
  tags: string[];
  description: string;
  approval: ApprovalDisplay;
  daysOffset: number; // negative = past, positive = future — the source of truth prisma/seed.ts resolves against Date.now()
}

const TODAY = new Date();
function offsetDate(daysOffset: number): Date {
  return new Date(TODAY.getTime() + daysOffset * 86400000);
}
function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function displayDateOf(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function slugify(title: string, suffix: string): string {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${suffix}`;
}

const events: EventDef[] = [];
const usedSlugs = new Set<string>();
let eventSeq = 1;

for (const club of CLUB_DEFS) {
  const templates = [...EVENT_TEMPLATES[club.slug]];
  const pastCount = randInt(4, 6);
  const upcomingCount = randInt(2, 4);

  // Past events: spread over the last 3-4 months, more recent + more of them
  // for high-activity clubs, older + fewer for the at-risk club.
  const pastOffsets: number[] = [];
  const maxPastAge = club.activity === "at-risk" ? randInt(95, 130) : randInt(100, 120);
  const minPastAge = club.activity === "at-risk" ? randInt(55, 75) : randInt(2, 9);
  for (let i = 0; i < pastCount; i += 1) {
    const t = i / Math.max(1, pastCount - 1);
    const jitter = randInt(-4, 4);
    pastOffsets.push(-Math.round(minPastAge + t * (maxPastAge - minPastAge)) + jitter);
  }
  pastOffsets.sort((a, b) => a - b);

  const upcomingOffsets: number[] = [];
  const maxUpcoming = club.activity === "at-risk" ? randInt(35, 55) : randInt(20, 45);
  for (let i = 0; i < upcomingCount; i += 1) {
    const t = i / Math.max(1, upcomingCount - 1);
    upcomingOffsets.push(Math.round(3 + t * maxUpcoming) + randInt(-2, 2));
  }

  const allOffsets = [...pastOffsets.map((o) => ({ o, status: "past" as const })), ...upcomingOffsets.map((o) => ({ o, status: "upcoming" as const }))];

  for (const { o, status } of allOffsets) {
    const template = templates.length > 0 ? templates.splice(randInt(0, templates.length - 1), 1)[0] : pick(EVENT_TEMPLATES[club.slug]);
    const date = offsetDate(o);
    const capacity = weighted<number>([[randInt(30, 60), 3], [randInt(60, 150), 4], [randInt(150, 400), 2]]);

    let fillRatio: number;
    if (status === "past") {
      fillRatio = club.activity === "at-risk" ? randInt(35, 65) / 100 : randInt(55, 98) / 100;
    } else {
      // Mixed capacity fill levels for upcoming events: some nearly full, some just opened.
      fillRatio = weighted<number>([[randInt(5, 20) / 100, 3], [randInt(35, 65) / 100, 3], [randInt(80, 98) / 100, 2]]);
    }
    const going = Math.max(status === "past" ? Math.round(capacity * fillRatio) : Math.round(capacity * fillRatio), 0);

    let approval: ApprovalDisplay;
    if (status === "past") {
      approval = "not-required";
    } else {
      approval = weighted<ApprovalDisplay>([["approved", 5], ["pending", 2], ["not-required", 2]]);
    }

    const slug = slugify(template.title, `${club.slug}-${eventSeq}`);
    eventSeq += 1;
    usedSlugs.add(slug);

    events.push({
      id: `e${events.length + 1}`,
      slug,
      title: template.title.includes("·") || club.slug === "sarga" || club.slug === "e-cell" || club.slug === "codechef" || club.slug === "arena"
        ? `${template.title} · ${club.name.split(" - ")[0].split(" ")[0]}`
        : template.title,
      clubSlug: club.slug,
      club: club.name,
      date: displayDateOf(date),
      isoDate: isoOf(date),
      time: pick(["9:00 AM", "10:00 AM", "2:00 PM", "5:00 PM", "6:30 PM", "7:00 PM", "8:00 PM", "9:00 PM"]),
      venue: template.venue,
      status,
      going,
      capacity,
      // Flagship templates get their own bespoke photo; every other event
      // falls back to its club's own banner photo rather than staying
      // photo-less — a bare gradient card reads as broken/unfinished next
      // to cards that do have a real image (#131).
      cover: COVERS[club.slug],
      photo: CURATED_PHOTOS[template.title] ?? club.photo,
      tags: template.tags,
      description: template.description,
      approval,
      daysOffset: o,
    });
  }
}

// ---------- event attendees (CountMeIn) ----------
interface AttendeeDef {
  eventSlug: string;
  memberId: string;
  checkedIn: boolean;
  registeredDaysAgo: number;
}
const attendees: AttendeeDef[] = [];
const membersByClub = new Map<string, MemberDef[]>();
for (const club of CLUB_SLUGS) {
  membersByClub.set(
    club,
    members.filter((m) => m.memberships.some((x) => x.clubSlug === club && x.status !== "Inactive")),
  );
}

for (const event of events) {
  // `going` (used for capacity/fill display) can run into the hundreds for
  // flagship events, same as the original hand-authored data — but we only
  // materialize a representative sample of actual CountMeIn-style rows, same
  // spirit as the app's own Math.max(event.going, _count.countMeIns) display
  // logic, so the seed stays fast and the DB stays small.
  const recordedCount = Math.min(event.going, 25);
  const clubMembers = membersByClub.get(event.clubSlug) ?? [];
  const outsiders = sample(
    members.filter((m) => !clubMembers.includes(m)),
    Math.min(members.length, Math.round(recordedCount * 0.15)),
  );
  const insiderCount = Math.max(0, recordedCount - outsiders.length);
  const insiders = sample(clubMembers, Math.min(clubMembers.length, insiderCount));
  const pool = [...insiders, ...outsiders].slice(0, recordedCount);
  // Backfill with any member if the club roster is too small to cover the target.
  while (pool.length < recordedCount) {
    const extra = pick(members);
    if (!pool.includes(extra)) pool.push(extra);
    else if (pool.length >= members.length) break;
  }

  for (const member of pool) {
    const checkedIn = event.status === "past" ? rand() < 0.72 : false;
    // Registration happens some days before the event date; expressed as
    // daysAgo-from-today (clamped to 0 for events registered "today").
    const leadDays = randInt(1, 14);
    const regOffset = event.daysOffset - leadDays; // more negative = further in the past
    attendees.push({
      eventSlug: event.slug,
      memberId: member.id,
      checkedIn,
      registeredDaysAgo: Math.max(-regOffset, 0),
    });
  }
}

// ---------- tasks ----------
interface TaskDef {
  id: string;
  title: string;
  eventSlug: string;
  role: string;
  status: "todo" | "doing" | "done";
  priority: "Low" | "Med" | "High";
  assigneeId: string;
  dueInDays: number;
}
const TASK_TITLES = [
  "Set up registration desk", "Print participant badges", "Coordinate sponsor booth setup",
  "Brief judges on scoring rubric", "Confirm mentor slots", "Set up PA & mic check",
  "Post event recap on Discord", "Book away-day transport", "Prep judging rubric sheets",
  "Confirm venue booking with facilities", "Draft post-event survey", "Arrange green-room snacks",
  "Test livestream setup", "Coordinate volunteer shift roster", "Print motion cards",
  "Set up scoreboard & timer", "Confirm catering headcount", "Load in AV equipment",
];
const taskDefs: TaskDef[] = [];
const TASK_COUNT = 75;
const eventPoolForTasks = events.filter((e) => e.status === "upcoming" || e.daysOffset >= -14);
for (let i = 0; i < TASK_COUNT; i += 1) {
  const event = pick(eventPoolForTasks.length > 0 ? eventPoolForTasks : events);
  const qualified = (membersByClub.get(event.clubSlug) ?? []).filter((m) =>
    m.memberships.some((x) => x.clubSlug === event.clubSlug && (x.role === "Volunteer" || x.role === "Coordinator")),
  );
  if (qualified.length === 0) continue;
  const assignee = pick(qualified);
  const isOverdue = i < 3; // guarantee a few realistically-overdue tasks
  const status: TaskDef["status"] = isOverdue ? weighted([["todo", 2], ["doing", 1]]) : weighted([["todo", 3], ["doing", 2], ["done", 3]]);
  const dueInDays = isOverdue ? -randInt(1, 6) : event.daysOffset + randInt(-3, 0);
  taskDefs.push({
    id: `t${taskDefs.length + 1}`,
    title: pick(TASK_TITLES),
    eventSlug: event.slug,
    role: pick(["Logistics", "Tech ops", "Coordination", "Content", "Hospitality"]),
    status,
    priority: weighted([["Low", 2], ["Med", 4], ["High", 2]]),
    assigneeId: assignee.id,
    dueInDays,
  });
}

// ---------- contributions ----------
interface ContributionDef {
  id: string;
  eventSlug: string;
  role: string;
  hoursLogged: number;
  verifiedDaysAgo: number;
  memberId: string;
}
const contributionDefs: ContributionDef[] = [];
const doneTasks = taskDefs.filter((t) => t.status === "done");
for (const task of doneTasks) {
  const event = events.find((e) => e.slug === task.eventSlug)!;
  contributionDefs.push({
    id: `v${contributionDefs.length + 1}`,
    eventSlug: task.eventSlug,
    role: task.role,
    hoursLogged: Math.round((randInt(3, 12) + rand()) * 10) / 10,
    verifiedDaysAgo: -event.daysOffset,
    memberId: task.assigneeId,
  });
}
// A few extra contributions from past-event volunteers beyond just done-task assignees.
for (const event of events.filter((e) => e.status === "past").slice(0, 12)) {
  const qualified = (membersByClub.get(event.clubSlug) ?? []).filter((m) =>
    m.memberships.some((x) => x.clubSlug === event.clubSlug && x.role === "Volunteer"),
  );
  if (qualified.length === 0 || rand() < 0.4) continue;
  const member = pick(qualified);
  contributionDefs.push({
    id: `v${contributionDefs.length + 1}`,
    eventSlug: event.slug,
    role: "Volunteer crew",
    hoursLogged: Math.round((randInt(2, 8) + rand()) * 10) / 10,
    verifiedDaysAgo: -event.daysOffset,
    memberId: member.id,
  });
}

// ---------- announcements ----------
interface AnnouncementDef {
  id: string;
  title: string;
  body: string;
  clubSlug: string;
  club: string;
  daysAgo: number;
  pinned: boolean;
  audience: "All" | "Coordinators" | "Volunteers";
  priority: "Low" | "Med" | "High";
}
const ANNOUNCEMENT_TEMPLATES: Record<string, { title: string; body: string }[]> = {
  codechef: [
    { title: "Cook-Off editorial is up", body: "The sqrt-decomp approach for Problem D is cleaner - writeup in the channel." },
    { title: "Interview prep slots open", body: "Six slots left for this week's mock interview circle. First come, first served." },
    { title: "Div 2 rating sync delayed", body: "Contest platform is re-running the rating sync — expect updated numbers by tomorrow morning." },
    { title: "New DSA reading group forming", body: "Starting a weekly reading group on segment trees and persistent structures. Sign up in the channel." },
    { title: "Regionals travel squad announced", body: "Squad list for the regional onsite is up. Travel form due by Friday." },
    { title: "Editorial writers needed", body: "Looking for two more editorial writers for next month's cook-off. DM if interested." },
  ],
  "e-cell": [
    { title: "Ignite registrations close soon", body: "Seats filling fast. If you're pitching, submit your one-liner before the deadline." },
    { title: "Mentor office hours moved", body: "This week's slots moved to the E-Cell lounge due to a room booking clash." },
    { title: "Alumni founder AMA next week", body: "Two alumni founders confirmed for a fireside chat. Submit questions in advance." },
    { title: "Pitch deck templates updated", body: "New deck template in the drive — matches what judges will actually be scoring against." },
    { title: "Startup weekend sponsor confirmed", body: "A new sponsor came on board for Ignite — prize pool bumped, details soon." },
    { title: "Founder circle applications open", body: "Applications for the next founder circle cohort are open through the end of the month." },
  ],
  sarga: [
    { title: "Rehearsal schedule update", body: "Amphitheatre is booked Thursday for another event. All acts, please adjust your slot." },
    { title: "New setlist uploaded", body: "Check the drive for this semester's fusion showcase setlist and chord charts." },
    { title: "New mic set arriving", body: "Two new condenser mics arriving this week — sign-up sheet for the first booking slot is up." },
    { title: "Vocalists needed for showcase", body: "Still short two vocalists for the fusion showcase closing number. Auditions this Friday." },
    { title: "Jam night moved to Studio B", body: "This week's open jam moves to Studio B — Amphitheatre is booked for a coordinator meeting." },
  ],
  paradox: [
    { title: "New motion pool uploaded", body: "Fresh motions across social, IR, and economics tracks. Sorted by difficulty." },
    { title: "MUN delegate prep sessions", body: "Two extra prep sessions added before the inter-college MUN. Bring your position papers." },
    { title: "Judging panel for Winter Open", body: "Judging panel for Winter Debate Open confirmed — briefing session Wednesday evening." },
    { title: "Travelling squad for BP nationals", body: "Squad shortlist for the BP nationals travel is up. Confirm availability by this weekend." },
    { title: "New practice round format", body: "Switching practice rounds to a shorter prep time to match the actual tournament format." },
  ],
  kalakriti: [
    { title: "Portfolio crit sign-ups open", body: "Ten slots, ten minutes each. First-come, first-served in the club channel." },
    { title: "Figma workshop this weekend", body: "Component libraries and auto-layout — bring a laptop, no prior Figma experience needed." },
    { title: "Brand study submissions due", body: "This month's brand teardown submissions are due Sunday night." },
    { title: "Guest critique from a design alum", body: "An alum from a product design team is joining Friday's crit session — bring your best work." },
    { title: "Illustration jam this Saturday", body: "Casual illustration jam, bring a tablet or paper — theme announced on the day." },
    { title: "Typography study group forming", body: "Starting a biweekly typography study group — pairing/kerning drills and type crit." },
  ],
  prakriti: [
    { title: "Volunteers needed for teach-in", body: "Looking for four more volunteers for next week's schools teach-in. Transport covered." },
    { title: "Tree drive rescheduled", body: "Weather pushed the tree drive to next Saturday — same meeting point, same time." },
    { title: "Zero-waste campaign kickoff", body: "Kickoff meeting for the semester's zero-waste campaign is this Tuesday evening." },
    { title: "Compost bin maintenance day", body: "Monthly compost bin maintenance — gloves provided, just show up." },
    { title: "Seed bank donations welcome", body: "Starting a campus seed bank — bring labeled seed packets to the next meeting." },
    { title: "Climate literacy workshop slots open", body: "Six slots left for facilitators at next week's schools climate literacy workshop." },
  ],
  quill: [
    { title: "Zine submissions closing", body: "Last call for this month's zine. Editing pairs assigned once submissions close." },
    { title: "Reading night lineup posted", body: "This month's reading night lineup is up — five readers, open mic slots after." },
    { title: "Workshop round 2 pairings", body: "Second workshop round pairings are posted. Read your partner's draft before Thursday." },
    { title: "New editor applications open", body: "Looking for a new poetry section editor for next semester's zine." },
    { title: "Guest poet visiting next month", body: "A published alum poet is doing a reading and Q&A next month — details soon." },
    { title: "Longform criticism track launching", body: "New track for essay-length criticism pieces starting next zine cycle." },
  ],
  arena: [
    { title: "Blitz night rating reset", body: "Club ratings reset for the new season. First blitz night this Friday." },
    { title: "Inter-college league fixtures", body: "Fixtures for the inter-college league are posted — check your board number." },
    { title: "Opening prep clinic this week", body: "Clinic on Sicilian setups this week — bring a board if you have one, extras available." },
    { title: "New beginner ladder starting", body: "A separate ladder for beginners starts this week — no rating requirement to join." },
    { title: "Bullet chess night added", body: "Adding a monthly bullet chess night by popular request — first one this Friday." },
    { title: "Club sets bought for beginners", body: "Ten new chess sets available to borrow for anyone without their own board." },
  ],
  photon: [
    { title: "Robotics lab access hours extended", body: "Lab now open until 10 PM on build-night days. Swipe access updated." },
    { title: "Hackware Showdown team registration open", body: "Teams of up to four. Component kit checkout starts Monday." },
    { title: "New sensor kits arrived", body: "IMU and ToF sensor kits arrived — check them out from the lab for weekend builds." },
    { title: "Line-follower workshop this Saturday", body: "Beginner-friendly line-follower build workshop, all parts provided." },
    { title: "Safety briefing mandatory for solder station", body: "New members must complete the safety briefing before using the solder station." },
  ],
  turf: [
    { title: "Inter-hostel cup fixtures posted", body: "Group stage fixtures are up on the noticeboard and club channel." },
    { title: "Weekend match rescheduled", body: "Saturday's five-a-side match moved to Sunday morning due to ground maintenance." },
    { title: "New boots and bibs ordered", body: "New kit arriving next week — sizes were collected at last week's session." },
    { title: "Fitness drills added to Tuesdays", body: "Added a short fitness drill block before Tuesday practice — optional but recommended." },
    { title: "Referees needed for group stage", body: "Looking for three volunteer referees for the inter-hostel cup group stage." },
    { title: "Turf ground resurfacing notice", body: "Ground closed for resurfacing next Monday and Tuesday — practice moves indoors." },
  ],
};
const announcementDefs: AnnouncementDef[] = [];
let annId = 1;
for (const club of CLUB_DEFS) {
  const templates = ANNOUNCEMENT_TEMPLATES[club.slug] ?? [];
  for (const t of templates) {
    announcementDefs.push({
      id: `a${annId++}`,
      title: t.title,
      body: t.body,
      clubSlug: club.slug,
      club: club.name,
      daysAgo: club.activity === "at-risk" ? randInt(20, 60) : randInt(0, 30) + rand(),
      pinned: rand() < 0.18,
      audience: weighted([["All", 6], ["Coordinators", 2], ["Volunteers", 2]]),
      priority: weighted([["Low", 3], ["Med", 4], ["High", 2]]),
    });
  }
}
announcementDefs.sort((a, b) => a.daysAgo - b.daysAgo);

// ---------- issues ----------
interface IssueDef {
  id: string;
  title: string;
  category: "Registration" | "Payment" | "Booking" | "Access" | "Other";
  status: "Open" | "InProgress" | "Resolved";
  raisedById: string;
  assigneeId?: string;
  clubSlug?: string;
  daysAgo: number;
  priority: "Low" | "Med" | "High";
}
const ISSUE_TEMPLATES: { category: IssueDef["category"]; title: string }[] = [
  { category: "Registration", title: "Can't count myself in - button loops" },
  { category: "Registration", title: "Waitlist position not updating" },
  { category: "Payment", title: "Merch payment shows pending after 48 hrs" },
  { category: "Payment", title: "Refund not received for cancelled event" },
  { category: "Booking", title: "Projector in seminar hall flickers" },
  { category: "Booking", title: "AC broken in the studio" },
  { category: "Booking", title: "Venue double-booked with another club" },
  { category: "Access", title: "Add my membership to club roster" },
  { category: "Access", title: "Can't access club drive folder" },
  { category: "Access", title: "Roll number mismatch on profile" },
  { category: "Other", title: "Club page shows outdated tagline" },
  { category: "Other", title: "Notification emails going to spam" },
  { category: "Other", title: "Duplicate account after re-signup" },
  { category: "Registration", title: "Capacity shows full but spots are open" },
  { category: "Booking", title: "Equipment checkout form not loading" },
  { category: "Access", title: "Coordinator role not reflecting after approval" },
];
const issueDefs: IssueDef[] = [];
const ISSUE_COUNT = 70;
for (let i = 0; i < ISSUE_COUNT; i += 1) {
  const template = ISSUE_TEMPLATES[i % ISSUE_TEMPLATES.length];
  const club = pick(CLUB_DEFS);
  const clubMembers = membersByClub.get(club.slug) ?? [];
  // raisedBy must actually be a member of the assigned club — always draw
  // from that club's roster (falls back to the global pool only if a club
  // somehow has zero members, which shouldn't happen at this dataset's scale).
  const raisedBy = clubMembers.length > 0 ? pick(clubMembers) : pick(members);
  const status: IssueDef["status"] = weighted([["Open", 4], ["InProgress", 3], ["Resolved", 4]]);
  const admins = clubMembers.filter((m) => m.memberships.some((x) => x.clubSlug === club.slug && (x.role === "Admin" || x.role === "Coordinator")));
  const assigneeId = status !== "Open" && admins.length > 0 && rand() < 0.7 ? pick(admins).id : undefined;
  issueDefs.push({
    id: `i${issueDefs.length + 1}`,
    title: template.title,
    category: template.category,
    status,
    raisedById: raisedBy.id,
    assigneeId,
    clubSlug: club.slug,
    daysAgo: randInt(0, 45) + rand(),
    priority: weighted([["Low", 3], ["Med", 4], ["High", 2]]),
  });
}

// ---------- venues & equipment ----------
const resources = [
  { id: "r1", name: "Amphitheatre", type: "Venue" as const, capacity: 300, availability: "Booked Fri 7 PM" },
  { id: "r2", name: "Seminar Hall 1", type: "Venue" as const, capacity: 80, availability: "Available" },
  { id: "r3", name: "Seminar Hall 3", type: "Venue" as const, capacity: 60, availability: "Available" },
  { id: "r4", name: "Studio B", type: "Venue" as const, capacity: 50, availability: "Booked Wed 8 PM" },
  { id: "r5", name: "Robotics Lab", type: "Venue" as const, capacity: 35, availability: "Pending confirmation" },
  { id: "r6", name: "Turf Ground", type: "Venue" as const, capacity: 40, availability: "Available" },
  { id: "r7", name: "Common Room", type: "Venue" as const, capacity: 80, availability: "Available" },
  { id: "r8", name: "Projector - Epson 4K", type: "Equipment" as const, capacity: 1, availability: "Available" },
  { id: "r9", name: "PA System - Yamaha", type: "Equipment" as const, capacity: 1, availability: "Booked Sat" },
  { id: "r10", name: "DSLR Kit - Canon", type: "Equipment" as const, capacity: 2, availability: "Pending confirmation" },
];

// ---------- transparency log: one per past event ----------
interface TransparencyDef {
  id: string;
  eventSlug: string;
  eventName: string;
  outcome: string;
  daysAgo: number;
  clubSlug: string;
  spend: string;
  attendance: string;
}
const transparencyDefs: TransparencyDef[] = [];
const OUTCOME_TEMPLATES = [
  "Solid turnout, positive feedback from first-timers.",
  "Sold-out capacity, waitlist opened for the next edition.",
  "Smaller than hoped, but strong engagement from those who came.",
  "Record attendance for this event series.",
  "Ran over budget slightly; venue fee came in higher than quoted.",
  "Came in under budget; surplus rolled into next semester's fund.",
];
for (const event of events.filter((e) => e.status === "past")) {
  const spendAmount = randInt(4, 220) * 1000;
  transparencyDefs.push({
    id: `l${transparencyDefs.length + 1}`,
    eventSlug: event.slug,
    eventName: event.title,
    outcome: pick(OUTCOME_TEMPLATES),
    daysAgo: -event.daysOffset,
    clubSlug: event.clubSlug,
    spend: spendAmount >= 100000 ? `₹${(spendAmount / 100000).toFixed(1)}L` : `₹${Math.round(spendAmount / 1000)}k`,
    attendance: `${event.going} / ${event.capacity}`,
  });
}

// ---------- club rollups (member counts, active flag, lastEvent) ----------
const clubMemberCounts = new Map<string, number>();
for (const club of CLUB_DEFS) {
  const count = members.filter((m) => m.memberships.some((x) => x.clubSlug === club.slug)).length;
  clubMemberCounts.set(club.slug, count);
}
function lastEventLabel(clubSlug: string): string {
  const clubEvents = events.filter((e) => e.clubSlug === clubSlug && e.daysOffset <= 0).sort((a, b) => b.daysOffset - a.daysOffset);
  if (clubEvents.length === 0) return "No recent events";
  const days = -clubEvents[0].daysOffset;
  if (days <= 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

// ---------- metrics ----------
const totalMembersMetric = members.length + 5 /* team accounts */ + facultyDefs.length + 1 /* Alok, faculty team account */;
const activeMembersMetric = members.filter((m) => m.memberships.some((x) => x.status === "Active")).length + 5;
const eventsThisMonth = events.filter((e) => Math.abs(e.daysOffset) <= 30).length;
const openIssuesMetric = issueDefs.filter((i) => i.status !== "Resolved").length;
const weeklyAttendance = [0, 0, 0, 0, 0, 0, 0];
for (const a of attendees) {
  if (a.registeredDaysAgo <= 7 && a.registeredDaysAgo >= 0) {
    const dayIdx = 6 - a.registeredDaysAgo;
    if (dayIdx >= 0 && dayIdx < 7) weeklyAttendance[dayIdx] += 1;
  }
}
const clubGrowth = CLUB_DEFS.filter((c) => ["codechef", "e-cell", "sarga", "kalakriti", "paradox", "prakriti"].includes(c.slug)).map((c) => ({
  club: c.name.split(" - ")[0].split(" ")[0],
  growth: members.filter((m) => m.memberships.some((x) => x.clubSlug === c.slug && x.joinedDaysAgo <= 60)).length,
}));

// ---------- FAQs (unchanged content) ----------
const faqs = [
  { q: "How do I join a club?", a: "Head to Browse Clubs, pick one, hit Join. Some clubs auto-approve; others need admin approval and you'll get a status update." },
  { q: "What if two events I want clash?", a: "Sangam flags conflicts on your dashboard. You can count yourself in for both - attendance is checked in separately - but organizers see who's double-booked." },
  { q: "How does event approval work?", a: "Small events go live instantly. Anything requiring venue booking, funds, or off-campus travel routes to the faculty coordinator queue." },
  { q: "Can I be a member of multiple clubs?", a: "Yes. Most students are in 2–3. Your dashboard filters announcements to only clubs you belong to." },
  { q: "Where do bulk imports live?", a: "Admin → Members → Import CSV. Template is downloadable. Duplicate roll numbers are skipped, not overwritten." },
  { q: "I found a bug. What do I do?", a: "Raise an issue from your dashboard. High-priority tickets ping the platform admin directly." },
];

// ================= serialize to lib/seed-data.ts =================
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function arr(strs: string[]): string {
  return `[${strs.map((s) => `"${esc(s)}"`).join(", ")}]`;
}

const lines: string[] = [];
lines.push(`// Seed dataset for prisma/seed.ts. Also the source for content that was`);
lines.push(`// deliberately kept static rather than modeled as a DB table (FAQ copy,`);
lines.push(`// and the landing page's decorative dashboard-preview mockup).`);
lines.push(`//`);
lines.push(`// Generated by scripts/generate-seed-data.ts — regenerate with`);
lines.push(`// \`npx tsx scripts/generate-seed-data.ts\` rather than hand-editing bulk`);
lines.push(`// content below. All dates are stored as offsets (daysAgo / daysOffset /`);
lines.push(`// daysInDays), resolved against Date.now() at prisma/seed.ts run time, so`);
lines.push(`// this dataset never goes stale.`);
lines.push("");

lines.push(`export type ClubCategory = "Technical" | "Cultural" | "Sports" | "Entrepreneurship" | "Literary" | "Social" | "Design";`);
lines.push("");
lines.push(`export interface Club {`);
lines.push(`  id: string;`);
lines.push(`  slug: string;`);
lines.push(`  name: string;`);
lines.push(`  tagline: string;`);
lines.push(`  category: ClubCategory;`);
lines.push(`  members: number;`);
lines.push(`  active: boolean;`);
lines.push(`  hue: string;`);
lines.push(`  emoji: string;`);
lines.push(`  lastEvent: string;`);
lines.push(`  founded: string;`);
lines.push(`  description: string;`);
lines.push(`  banner: string;`);
lines.push(`  photo?: string;`);
lines.push(`}`);
lines.push("");
lines.push(`function clubGradient(hue: string): string {`);
lines.push(`  return \`linear-gradient(135deg, oklch(0.32 0.09 \${hue}) 0%, oklch(0.15 0.04 \${hue}) 100%)\`;`);
lines.push(`}`);
lines.push("");
lines.push(`export const clubs: Club[] = [`);
for (const c of CLUB_DEFS) {
  const memberCount = clubMemberCounts.get(c.slug)! + (c.slug === "codechef" ? 1 : 0);
  const active = c.activity !== "at-risk";
  const photoField = c.photo ? `, photo: "${c.photo}"` : "";
  lines.push(
    `  { id: "${c.id}", slug: "${c.slug}", name: "${esc(c.name)}", tagline: "${esc(c.tagline)}", category: "${c.category}", members: ${memberCount}, active: ${active}, hue: "${c.hue}", emoji: "${c.emoji}", lastEvent: "${lastEventLabel(c.slug)}", founded: "${c.founded}", description: "${esc(c.description)}", banner: clubGradient("${c.hue}")${photoField} },`,
  );
}
lines.push(`];`);
lines.push("");

lines.push(`export type EventStatus = "upcoming" | "live" | "past";`);
lines.push(`export interface Event {`);
lines.push(`  id: string;`);
lines.push(`  slug: string;`);
lines.push(`  title: string;`);
lines.push(`  clubSlug: string;`);
lines.push(`  club: string;`);
lines.push(`  date: string;`);
lines.push(`  isoDate: string;`);
lines.push(`  daysOffset: number;`);
lines.push(`  time: string;`);
lines.push(`  venue: string;`);
lines.push(`  status: EventStatus;`);
lines.push(`  going: number;`);
lines.push(`  capacity: number;`);
lines.push(`  cover: string;`);
lines.push(`  photo?: string;`);
lines.push(`  tags: string[];`);
lines.push(`  description: string;`);
lines.push(`  approval: "approved" | "pending" | "not-required" | "rejected";`);
lines.push(`}`);
lines.push("");
lines.push(`export const events: Event[] = [`);
for (const e of events) {
  const photoField = e.photo ? `, photo: "${e.photo}"` : "";
  lines.push(
    `  { id: "${e.id}", slug: "${e.slug}", title: "${esc(e.title)}", clubSlug: "${e.clubSlug}", club: "${esc(e.club)}", date: "${esc(e.date)}", isoDate: "${e.isoDate}", daysOffset: ${e.daysOffset}, time: "${e.time}", venue: "${esc(e.venue)}", status: "${e.status}", going: ${e.going}, capacity: ${e.capacity}, cover: "${e.cover}"${photoField}, tags: ${arr(e.tags)}, description: "${esc(e.description)}", approval: "${e.approval}" },`,
  );
}
lines.push(`];`);
lines.push("");

lines.push(`/** Who's registered for which event — replaces the old capacity-only mock pool. */`);
lines.push(`export interface EventAttendee {`);
lines.push(`  eventSlug: string;`);
lines.push(`  memberId: string;`);
lines.push(`  checkedIn: boolean;`);
lines.push(`  registeredDaysAgo: number;`);
lines.push(`}`);
lines.push(`export const eventAttendees: EventAttendee[] = [`);
for (const a of attendees) {
  lines.push(`  { eventSlug: "${a.eventSlug}", memberId: "${a.memberId}", checkedIn: ${a.checkedIn}, registeredDaysAgo: ${Math.round(a.registeredDaysAgo)} },`);
}
lines.push(`];`);
lines.push("");

lines.push(`export interface Announcement {`);
lines.push(`  id: string;`);
lines.push(`  title: string;`);
lines.push(`  body: string;`);
lines.push(`  clubSlug: string;`);
lines.push(`  club: string;`);
lines.push(`  daysAgo: number;`);
lines.push(`  pinned: boolean;`);
lines.push(`  audience: "All" | "Coordinators" | "Volunteers";`);
lines.push(`  priority: "Low" | "Med" | "High";`);
lines.push(`}`);
lines.push(`export const announcements: Announcement[] = [`);
for (const a of announcementDefs) {
  lines.push(
    `  { id: "${a.id}", title: "${esc(a.title)}", body: "${esc(a.body)}", clubSlug: "${a.clubSlug}", club: "${esc(a.club)}", daysAgo: ${a.daysAgo.toFixed(2)}, pinned: ${a.pinned}, audience: "${a.audience}", priority: "${a.priority}" },`,
  );
}
lines.push(`];`);
lines.push("");

lines.push(`export interface Issue {`);
lines.push(`  id: string;`);
lines.push(`  title: string;`);
lines.push(`  category: "Registration" | "Payment" | "Booking" | "Access" | "Other";`);
lines.push(`  status: "Open" | "InProgress" | "Resolved";`);
lines.push(`  raisedById: string;`);
lines.push(`  assigneeId?: string;`);
lines.push(`  clubSlug?: string;`);
lines.push(`  daysAgo: number;`);
lines.push(`  priority: "Low" | "Med" | "High";`);
lines.push(`}`);
lines.push(`export const issues: Issue[] = [`);
for (const i of issueDefs) {
  const assigneeField = i.assigneeId ? `, assigneeId: "${i.assigneeId}"` : "";
  const clubField = i.clubSlug ? `, clubSlug: "${i.clubSlug}"` : "";
  lines.push(
    `  { id: "${i.id}", title: "${esc(i.title)}", category: "${i.category}", status: "${i.status}", raisedById: "${i.raisedById}"${assigneeField}${clubField}, daysAgo: ${i.daysAgo.toFixed(2)}, priority: "${i.priority}" },`,
  );
}
lines.push(`];`);
lines.push("");

lines.push(`export interface Task {`);
lines.push(`  id: string;`);
lines.push(`  title: string;`);
lines.push(`  eventSlug: string;`);
lines.push(`  role: string;`);
lines.push(`  status: "todo" | "doing" | "done";`);
lines.push(`  priority: "Low" | "Med" | "High";`);
lines.push(`  assigneeId: string;`);
lines.push(`  dueInDays: number;`);
lines.push(`}`);
lines.push(`export const tasks: Task[] = [`);
for (const t of taskDefs) {
  lines.push(
    `  { id: "${t.id}", title: "${esc(t.title)}", eventSlug: "${t.eventSlug}", role: "${t.role}", status: "${t.status}", priority: "${t.priority}", assigneeId: "${t.assigneeId}", dueInDays: ${t.dueInDays} },`,
  );
}
lines.push(`];`);
lines.push("");

lines.push(`/** Verified volunteering hours — shared across volunteer dashboard + any future coordinator views. */`);
lines.push(`export interface Contribution {`);
lines.push(`  id: string;`);
lines.push(`  eventSlug: string;`);
lines.push(`  role: string;`);
lines.push(`  hoursLogged: number;`);
lines.push(`  verifiedDaysAgo: number;`);
lines.push(`  memberId: string;`);
lines.push(`}`);
lines.push(`export const contributions: Contribution[] = [`);
for (const c of contributionDefs) {
  lines.push(
    `  { id: "${c.id}", eventSlug: "${c.eventSlug}", role: "${esc(c.role)}", hoursLogged: ${c.hoursLogged}, verifiedDaysAgo: ${c.verifiedDaysAgo}, memberId: "${c.memberId}" },`,
  );
}
lines.push(`];`);
lines.push("");

lines.push(`export interface ClubMembership {`);
lines.push(`  clubSlug: string;`);
lines.push(`  role: "Member" | "Volunteer" | "Coordinator" | "Admin";`);
lines.push(`  status: "Active" | "Pending" | "Inactive";`);
lines.push(`  joinedDaysAgo: number;`);
lines.push(`}`);
lines.push(`export interface Member {`);
lines.push(`  id: string;`);
lines.push(`  name: string;`);
lines.push(`  roll: string;`);
lines.push(`  avatar: string;`);
lines.push(`  interests: string[];`);
lines.push(`  memberships: ClubMembership[];`);
lines.push(`}`);
lines.push(`export const members: Member[] = [`);
for (const m of members) {
  const memberships = m.memberships
    .map((x) => `{ clubSlug: "${x.clubSlug}", role: "${x.role}", status: "${x.status}", joinedDaysAgo: ${x.joinedDaysAgo} }`)
    .join(", ");
  lines.push(`  { id: "${m.id}", name: "${esc(m.name)}", roll: "${m.roll}", avatar: "${m.avatar}", interests: ${arr(m.interests)}, memberships: [${memberships}] },`);
}
lines.push(`];`);
lines.push("");

lines.push(`export interface FacultyMember {`);
lines.push(`  id: string;`);
lines.push(`  name: string;`);
lines.push(`  email: string;`);
lines.push(`}`);
lines.push(`export const faculty: FacultyMember[] = [`);
for (const f of facultyDefs) {
  lines.push(`  { id: "${f.id}", name: "${esc(f.name)}", email: "${f.email}" },`);
}
lines.push(`];`);
lines.push("");

lines.push(`export const faqs = [`);
for (const f of faqs) {
  lines.push(`  { q: "${esc(f.q)}", a: "${esc(f.a)}" },`);
}
lines.push(`];`);
lines.push("");

lines.push(`export const resources = [`);
for (const r of resources) {
  lines.push(`  { id: "${r.id}", name: "${esc(r.name)}", type: "${r.type}", capacity: ${r.capacity}, availability: "${esc(r.availability)}" },`);
}
lines.push(`];`);
lines.push("");

lines.push(`export const metrics = {`);
lines.push(`  totalMembers: ${totalMembersMetric},`);
lines.push(`  activeMembers: ${activeMembersMetric},`);
lines.push(`  eventsThisMonth: ${eventsThisMonth},`);
lines.push(`  openIssues: ${openIssuesMetric},`);
lines.push(`  weeklyAttendance: [${weeklyAttendance.join(", ")}],`);
lines.push(`  clubGrowth: [`);
for (const g of clubGrowth) {
  lines.push(`    { club: "${esc(g.club)}", growth: ${g.growth} },`);
}
lines.push(`  ],`);
lines.push(`};`);
lines.push("");

lines.push(`export interface TransparencyEntry {`);
lines.push(`  id: string;`);
lines.push(`  eventSlug: string;`);
lines.push(`  eventName: string;`);
lines.push(`  outcome: string;`);
lines.push(`  daysAgo: number;`);
lines.push(`  clubSlug: string;`);
lines.push(`  spend: string;`);
lines.push(`  attendance: string;`);
lines.push(`}`);
lines.push(`export const transparencyLog: TransparencyEntry[] = [`);
for (const t of transparencyDefs) {
  lines.push(
    `  { id: "${t.id}", eventSlug: "${t.eventSlug}", eventName: "${esc(t.eventName)}", outcome: "${esc(t.outcome)}", daysAgo: ${t.daysAgo}, clubSlug: "${t.clubSlug}", spend: "${t.spend}", attendance: "${esc(t.attendance)}" },`,
  );
}
lines.push(`];`);
lines.push("");

const outPath = path.join(process.cwd(), "lib", "seed-data.ts");
writeFileSync(outPath, lines.join("\n"), "utf8");

console.log(`Generated ${outPath}`);
console.log(`  clubs: ${CLUB_DEFS.length}`);
console.log(`  members: ${members.length} (+ 5 team accounts + ${facultyDefs.length} dedicated faculty + 1 faculty team account)`);
console.log(`  events: ${events.length} (${events.filter((e) => e.status === "past").length} past, ${events.filter((e) => e.status === "upcoming").length} upcoming)`);
console.log(`  eventAttendees: ${attendees.length}`);
console.log(`  tasks: ${taskDefs.length} (overdue: ${taskDefs.filter((t) => t.dueInDays < 0 && t.status !== "done").length})`);
console.log(`  contributions: ${contributionDefs.length}`);
console.log(`  announcements: ${announcementDefs.length}`);
console.log(`  issues: ${issueDefs.length}`);
console.log(`  transparencyLog: ${transparencyDefs.length}`);
for (const c of CLUB_DEFS) {
  console.log(`  ${c.slug.padEnd(10)} members=${clubMemberCounts.get(c.slug)! + (c.slug === "codechef" ? 1 : 0)} activity=${c.activity}`);
}
