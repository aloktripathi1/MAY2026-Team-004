/**
 * Regenerates lib/seed-data.ts from the fixed roster/club/event/task
 * dataset below (docs/seed-data-spec — see PR description). Everything
 * here is explicit and deterministic (no RNG): every name, email, club,
 * event, task, announcement and issue was specified by hand, so re-running
 * this script reproduces the exact same file byte-for-byte (modulo the
 * date/isoDate decorative strings, which are computed against the run date).
 *
 * Run with `bun run scripts/generate-seed-data.ts`.
 *
 * Notes:
 * - c1-c8 keep stable ids/slugs; prisma/seed.ts and the 5 real team
 *   accounts (added directly in prisma/seed.ts, not here) reference them
 *   by slug.
 * - Team accounts (Alok/Vishal/Pardhiv/Purnendu/Ashish) are NOT part of
 *   this file — they're seeded with bespoke role-specific data directly in
 *   prisma/seed.ts, on top of the generic roster below.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

const BLOB = "https://os40qg3iuevjlpga.public.blob.vercel-storage.com";

// ---------- clubs ----------
interface ClubSpec {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  hue: string;
  emoji: string;
  founded: string;
  description: string;
  active: boolean;
  banner: string;
  photo: string;
}
const CLUBS: ClubSpec[] = [
  { id: "c1", slug: "codechef", name: "CodeChef IITM BS", tagline: "Competitive programming, weekly contests.", category: "Technical", hue: "122", emoji: "◉", founded: "2021", description: "Weekly cook-offs, algorithm deep-dives, and interview prep circles. Home for anyone who thinks in edge cases.", active: true, banner: `${BLOB}/club-banners/codechef.jpg`, photo: `${BLOB}/club-banners/codechef.jpg` },
  { id: "c2", slug: "paradox", name: "Paradox Debate Society", tagline: "Parliamentary debate, MUN prep, public speaking.", category: "Literary", hue: "5", emoji: "❋", founded: "2020", description: "British Parliamentary debate, Model UN prep, and public speaking workshops. Weekly practice rounds, traveling squad.", active: true, banner: `${BLOB}/club-banners/paradox.jpg`, photo: `${BLOB}/club-banners/paradox.jpg` },
  { id: "c3", slug: "sarga", name: "Sarga Music Circle", tagline: "Fusion, jams, semester showcases.", category: "Cultural", hue: "260", emoji: "♪", founded: "2019", description: "Instrumentalists, vocalists, producers. Open jam every Friday, big fusion show every semester, open mic nights.", active: true, banner: `${BLOB}/club-banners/sarga.jpg`, photo: `${BLOB}/club-banners/sarga.jpg` },
  { id: "c4", slug: "kalakriti", name: "Kalakriti Design Guild", tagline: "Product/UI design, illustration critique.", category: "Design", hue: "85", emoji: "◐", founded: "2022", description: "Portfolio reviews, Figma workshops, brand studies, illustration critique. Cross-pollination with product & marketing.", active: true, banner: `${BLOB}/club-banners/kalakriti.jpg`, photo: `${BLOB}/club-banners/kalakriti.jpg` },
  { id: "c5", slug: "prakriti", name: "Prakriti Sustainability", tagline: "Campus greening, climate action, waste audits.", category: "Social", hue: "155", emoji: "❦", founded: "2021", description: "Campus greening campaigns, climate action drives, and waste audits. Zero-waste campaigns and climate literacy workshops for local schools.", active: true, banner: `${BLOB}/club-banners/prakriti.jpg`, photo: `${BLOB}/club-banners/prakriti.jpg` },
  { id: "c6", slug: "e-cell", name: "E-Cell IITM BS", tagline: "Founder circles, startup weekends, pitch practice.", category: "Entrepreneurship", hue: "45", emoji: "◈", founded: "2019", description: "Founder circles, mentor office hours, pitch practice, and the annual Ignite startup weekend. Alumni founder network.", active: true, banner: `${BLOB}/club-banners/e-cell.jpg`, photo: `${BLOB}/club-banners/e-cell.jpg` },
  { id: "c7", slug: "quill", name: "Quill Writers' Circle", tagline: "Prose, poetry, longform criticism, writing sprints.", category: "Literary", hue: "320", emoji: "✦", founded: "2022", description: "Monthly zine, workshop rounds, and reading nights. Fiction, poetry, essays, longform criticism, writing sprints, all welcome.", active: false, banner: `${BLOB}/club-banners/quill.jpg`, photo: `${BLOB}/club-banners/quill.jpg` },
  { id: "c8", slug: "arena", name: "Arena Chess Club", tagline: "Blitz, bullet, and team leagues, rating ladder.", category: "Sports", hue: "0", emoji: "♞", founded: "2020", description: "Weekly blitz and bullet nights, inter-college team leagues, opening prep clinics, and a running rating ladder. Beginners always welcome.", active: true, banner: `${BLOB}/club-banners/arena.jpg`, photo: `${BLOB}/club-banners/arena.jpg` },
];
const clubBySlug = new Map(CLUBS.map((c) => [c.slug, c]));

function clubGradient(hue: string): string {
  return `linear-gradient(135deg, oklch(0.32 0.09 ${hue}) 0%, oklch(0.15 0.04 ${hue}) 100%)`;
}

// ---------- interest tags ----------
const INTEREST_POOL = ["Tech", "Debate", "Music", "Design", "Sustainability", "Entrepreneurship", "Writing", "Strategy Games", "Public Speaking", "Photography", "Dance", "Finance"];
const CLUB_TAGS: Record<string, string[]> = {
  codechef: ["Tech"],
  paradox: ["Debate", "Public Speaking"],
  sarga: ["Music", "Dance"],
  kalakriti: ["Design", "Photography"],
  prakriti: ["Sustainability"],
  "e-cell": ["Entrepreneurship", "Finance"],
  quill: ["Writing"],
  arena: ["Strategy Games"],
};

// ---------- members ----------
type Tier = "admin" | "coordinator" | "volunteer" | "member";
interface MembershipSpec { clubSlug: string; role: "Member" | "Volunteer" | "Coordinator" | "Admin"; status: "Active" | "Pending" | "Inactive"; joinedDaysAgo: number }
interface MemberSpec { id: string; name: string; roll: string; tier: Tier; memberships: MembershipSpec[] }

const ADMINS: { name: string; roll: string; clubs: string[] }[] = [
  { name: "Aditya Raghunathan", roll: "22s3001842", clubs: ["codechef", "e-cell"] },
  { name: "Sneha Bhattacharya", roll: "23s2004417", clubs: ["paradox", "quill"] },
  { name: "Karthik Subramaniam", roll: "21s1002556", clubs: ["sarga", "arena"] },
  { name: "Priyanka Deshmukh", roll: "23s3007729", clubs: ["kalakriti", "prakriti"] },
];
const COORDINATORS: { name: string; roll: string; coordClub: string; memberClub: string }[] = [
  { name: "Rahul Mehta", roll: "23s2001183", coordClub: "codechef", memberClub: "arena" },
  { name: "Ishita Rao", roll: "22s3005561", coordClub: "paradox", memberClub: "quill" },
  { name: "Aman Tripathi", roll: "24s1000392", coordClub: "e-cell", memberClub: "codechef" },
  { name: "Priya Venkataraman", roll: "23s3002270", coordClub: "sarga", memberClub: "kalakriti" },
  { name: "Kabir Anand", roll: "22s2006648", coordClub: "kalakriti", memberClub: "sarga" },
  { name: "Meera Iyengar", roll: "23s1004415", coordClub: "prakriti", memberClub: "e-cell" },
];
// Volunteer club assignment mirrors which club's events their tasks (section 4) are mostly tied to.
const VOLUNTEERS: { name: string; roll: string; club: string; secondaryClub: string }[] = [
  { name: "Rohan Kulkarni", roll: "24s2001127", club: "codechef", secondaryClub: "paradox" },
  { name: "Ananya Krishnan", roll: "23s3006654", club: "e-cell", secondaryClub: "codechef" },
  { name: "Vivek Choudhary", roll: "22s1003381", club: "sarga", secondaryClub: "codechef" },
  { name: "Divya Ramaswamy", roll: "23s2007792", club: "codechef", secondaryClub: "e-cell" },
  { name: "Arjun Malhotra", roll: "24s3000915", club: "e-cell", secondaryClub: "sarga" },
  { name: "Nisha Pillai", roll: "22s2004470", club: "sarga", secondaryClub: "quill" },
  { name: "Siddharth Bose", roll: "23s1006238", club: "prakriti", secondaryClub: "arena" },
  { name: "Tanvi Agarwal", roll: "24s2002561", club: "kalakriti", secondaryClub: "e-cell" },
];
const MEMBERS_PLAIN: { name: string; roll: string; forceClub?: { clubSlug: string; status: "Pending" } }[] = [
  { name: "Harshita Nambiar", roll: "23s3009914" },
  { name: "Yash Pandey", roll: "22s1007733" },
  { name: "Riya Sengupta", roll: "24s2003348" },
  { name: "Naveen Reddy", roll: "23s2008821" },
  { name: "Pooja Shetty", roll: "22s3002216" },
  { name: "Aryan Khanna", roll: "24s1001570" },
  { name: "Lakshmi Narasimhan", roll: "23s3005589" },
  { name: "Dev Patel", roll: "22s2009984", forceClub: { clubSlug: "e-cell", status: "Pending" } },
  { name: "Sanjana Menon", roll: "24s3001143", forceClub: { clubSlug: "e-cell", status: "Pending" } },
  { name: "Abhishek Bansal", roll: "23s1002867" },
  { name: "Kavya Balakrishnan", roll: "22s1005612" },
  { name: "Rajat Kapoor", roll: "24s2004709" },
  { name: "Nandini Joshi", roll: "23s3003356" },
  { name: "Varun Sethi", roll: "22s2001098" },
  { name: "Ishaan Verma", roll: "24s1006475" },
  { name: "Aditi Chatterjee", roll: "23s2002739" },
  { name: "Manish Goyal", roll: "22s3008861" }, // submits the Vaad Debate Collective club request
  { name: "Swati Kulshreshtha", roll: "24s3005923" },
  { name: "Nikhil Bhargava", roll: "23s1009182" },
  { name: "Ritika Saxena", roll: "22s2007345" },
];

const members: MemberSpec[] = [];
let mCounter = 1;
const nextMemberId = () => `m${mCounter++}`;

for (const a of ADMINS) {
  members.push({
    id: nextMemberId(),
    name: a.name,
    roll: a.roll,
    tier: "admin",
    memberships: a.clubs.map((clubSlug, i) => ({ clubSlug, role: "Admin", status: "Active", joinedDaysAgo: 640 - i * 8 })),
  });
}
for (const c of COORDINATORS) {
  members.push({
    id: nextMemberId(),
    name: c.name,
    roll: c.roll,
    tier: "coordinator",
    memberships: [
      { clubSlug: c.coordClub, role: "Coordinator", status: "Active", joinedDaysAgo: 480 },
      { clubSlug: c.memberClub, role: "Member", status: "Active", joinedDaysAgo: 210 },
    ],
  });
}
for (const v of VOLUNTEERS) {
  members.push({
    id: nextMemberId(),
    name: v.name,
    roll: v.roll,
    tier: "volunteer",
    memberships: [
      { clubSlug: v.club, role: "Volunteer", status: "Active", joinedDaysAgo: 300 },
      { clubSlug: v.secondaryClub, role: "Member", status: "Active", joinedDaysAgo: 140 },
    ],
  });
}
const CLUB_SLUGS = CLUBS.map((c) => c.slug);
MEMBERS_PLAIN.forEach((p, i) => {
  const primary = CLUB_SLUGS[i % 8];
  const secondary = CLUB_SLUGS[(i + 3) % 8];
  const memberships: MembershipSpec[] = [
    { clubSlug: primary, role: "Member", status: "Active", joinedDaysAgo: 260 - i * 3 },
    { clubSlug: secondary, role: "Member", status: "Active", joinedDaysAgo: 150 - i * 2 },
  ];
  if (i % 2 === 0) memberships.push({ clubSlug: CLUB_SLUGS[(i + 5) % 8], role: "Member", status: "Active", joinedDaysAgo: 90 - i });
  if (i % 5 === 0) memberships.push({ clubSlug: CLUB_SLUGS[(i + 6) % 8], role: "Member", status: "Active", joinedDaysAgo: 45 });
  if (p.forceClub) {
    const existing = memberships.find((m) => m.clubSlug === p.forceClub!.clubSlug);
    if (existing) { existing.status = p.forceClub.status; existing.joinedDaysAgo = 5; }
    else memberships.push({ clubSlug: p.forceClub.clubSlug, role: "Member", status: p.forceClub.status, joinedDaysAgo: 5 });
  }
  members.push({ id: nextMemberId(), name: p.name, roll: p.roll, tier: "member", memberships });
});

function interestsFor(m: MemberSpec): string[] {
  const clubTags = Array.from(new Set(m.memberships.flatMap((ms) => CLUB_TAGS[ms.clubSlug] ?? []))).slice(0, 2);
  const discoveryPool = INTEREST_POOL.filter((t) => !clubTags.includes(t));
  const discovery = discoveryPool[m.id.length + m.name.length % discoveryPool.length] ?? discoveryPool[0];
  return Array.from(new Set([...clubTags, discovery]));
}

// ---------- faculty ----------
const faculty = [
  { id: "f1", name: "Dr. Rajeshwari Nair", email: "rajeshwari.nair@ds.study.iitm.ac.in" },
  { id: "f2", name: "Dr. Vikram Chandrasekhar", email: "vikram.chandrasekhar@ds.study.iitm.ac.in" },
];

// ---------- events ----------
interface EventSpec {
  clubSlug: string;
  title: string;
  status: "past" | "upcoming";
  venue: string;
  going: number;
  capacity: number;
  daysOffset: number;
  approval: "approved" | "pending" | "not-required";
  tags: string[];
  description: string;
  photo?: string;
  transparency?: { outcome: string; spend: string; attendance: string };
}
const EVENTS: EventSpec[] = [
  // ---- CodeChef IITM BS ----
  { clubSlug: "codechef", title: "Weekly Cook-Off #47", status: "past", venue: "Online · Discord", going: 218, capacity: 300, daysOffset: -35, approval: "not-required", tags: ["Contest", "Online"], description: "Four problems, two hours, one leaderboard. Editorial released 10 minutes after end.", photo: `${BLOB}/club-events/cook-off-42.png` },
  { clubSlug: "codechef", title: "DSA Bootcamp: Trees & Graphs", status: "past", venue: "Seminar Hall 2", going: 85, capacity: 90, daysOffset: -21, approval: "not-required", tags: ["Workshop"], description: "From first principles to lazy propagation, with practice problems to close.", photo: `${BLOB}/club-events/hacktoberfest.jpg` },
  { clubSlug: "codechef", title: "Hack-a-Sangam 24h", status: "past", venue: "CRC Auditorium", going: 96, capacity: 100, daysOffset: -14, approval: "not-required", tags: ["Hackathon"], description: "24-hour build sprint, mentors on rotation, demos judged live at the end.", photo: `${BLOB}/club-events/cook-off-42.png`, transparency: { outcome: "Strong turnout, 12 teams shipped working prototypes.", spend: "₹18,500", attendance: "90" } },
  { clubSlug: "codechef", title: "Weekly Cook-Off #48", status: "upcoming", venue: "Online · Discord", going: 140, capacity: 300, daysOffset: 2, approval: "approved", tags: ["Contest", "Online"], description: "Four problems, two hours, one leaderboard. Editorial released 10 minutes after end.", photo: `${BLOB}/club-events/cook-off-42.png` },
  { clubSlug: "codechef", title: "Placement Prep: System Design Crash Course", status: "upcoming", venue: "Seminar Hall 1", going: 0, capacity: 100, daysOffset: 10, approval: "pending", tags: ["Careers", "Workshop"], description: "Load balancers to sharding, with two whiteboard case studies.", photo: `${BLOB}/club-events/hacktoberfest.jpg` },
  // ---- Paradox Debate Society ----
  { clubSlug: "paradox", title: "BP Open Round", status: "past", venue: "Seminar Hall 3", going: 42, capacity: 60, daysOffset: -40, approval: "not-required", tags: ["Debate"], description: "British Parliamentary format. Motions announced 15 minutes before each round.", photo: `${BLOB}/club-events/bp-open-round.png` },
  { clubSlug: "paradox", title: "Novice Parliamentary Workshop", status: "past", venue: "Seminar Hall 2", going: 55, capacity: 60, daysOffset: -25, approval: "not-required", tags: ["Debate", "Workshop"], description: "First-timer friendly. POI drills, case construction, and a mock round.", photo: `${BLOB}/club-events/cat-mun-conference.jpg` },
  { clubSlug: "paradox", title: "Inter-IIT MUN Selection Trials", status: "past", venue: "CRC Auditorium", going: 40, capacity: 45, daysOffset: -18, approval: "not-required", tags: ["MUN"], description: "Position paper review and committee simulation to shortlist the travel delegation.", photo: `${BLOB}/club-events/cat-mun-conference.jpg`, transparency: { outcome: "Selected 6-member MUN delegation.", spend: "₹6,000", attendance: "40" } },
  { clubSlug: "paradox", title: "Fusion Night Debate Exhibition", status: "upcoming", venue: "Amphitheatre", going: 30, capacity: 80, daysOffset: 6, approval: "approved", tags: ["Debate", "Exhibition"], description: "An exhibition round pairing debate with Sarga's Fusion Night crowd — showcase format, audience judged.", photo: `${BLOB}/club-events/bp-open-round.png` },
  { clubSlug: "paradox", title: "BP Open Round II", status: "upcoming", venue: "Seminar Hall 3", going: 0, capacity: 60, daysOffset: 15, approval: "pending", tags: ["Debate"], description: "British Parliamentary format. Motions announced 15 minutes before each round.", photo: `${BLOB}/club-events/bp-open-round.png` },
  // ---- Sarga Music Circle ----
  { clubSlug: "sarga", title: "Fusion Night VI — Sarga Live", status: "upcoming", venue: "Amphitheatre", going: 187, capacity: 250, daysOffset: 4, approval: "approved", tags: ["Music", "Open"], description: "The flagship fusion showcase. Six acts, one hour of chaos, one hour of soul.", photo: `${BLOB}/club-events/fusion-night-vi.png` },
  { clubSlug: "sarga", title: "Open Mic: Monsoon Edition", status: "past", venue: "OAT", going: 120, capacity: 130, daysOffset: -30, approval: "not-required", tags: ["Music", "Open"], description: "Open mic slots, ten minutes each, sign up on the day.", photo: `${BLOB}/club-events/sarga-open-jam.png` },
  { clubSlug: "sarga", title: "Acoustic Jam Session", status: "past", venue: "Seminar Hall 1", going: 45, capacity: 50, daysOffset: -20, approval: "not-required", tags: ["Music"], description: "Stripped-down acoustic sets, string and wind instruments only.", photo: `${BLOB}/club-events/cat-music-studio.jpg` },
  { clubSlug: "sarga", title: "Semester Showcase: Ragas & Rhythms", status: "past", venue: "CRC Auditorium", going: 300, capacity: 320, daysOffset: -60, approval: "not-required", tags: ["Music", "Flagship"], description: "Semester-closing showcase, fourteen acts across genres.", photo: `${BLOB}/club-events/cat-music-performance.jpg`, transparency: { outcome: "Sold-out showcase, 14 performances.", spend: "₹42,000", attendance: "300" } },
  { clubSlug: "sarga", title: "Battle of Bands Auditions", status: "upcoming", venue: "OAT", going: 0, capacity: 60, daysOffset: 12, approval: "pending", tags: ["Music", "Competition"], description: "Five-minute set auditions for a slot in this semester's Battle of Bands.", photo: `${BLOB}/club-events/sarga-open-jam.png` },
  // ---- Kalakriti Design Guild ----
  { clubSlug: "kalakriti", title: "Portfolio Critique Circle #12", status: "past", venue: "Seminar Hall 2", going: 30, capacity: 35, daysOffset: -22, approval: "not-required", tags: ["Design"], description: "Bring three screens or one case study. Ten-minute slots, brutally honest, brutally kind.", photo: `${BLOB}/club-events/portfolio-crit.png` },
  { clubSlug: "kalakriti", title: "UI/UX Bootcamp Weekend", status: "past", venue: "Seminar Hall 1", going: 65, capacity: 70, daysOffset: -35, approval: "not-required", tags: ["Design", "Workshop"], description: "Two-day intensive: heuristics, wireframes, and a live redesign critique.", photo: `${BLOB}/club-events/cat-electronics-workshop.jpg` },
  { clubSlug: "kalakriti", title: "Design Fest: Prakriti x Kalakriti Collab Showcase", status: "past", venue: "Amphitheatre", going: 150, capacity: 160, daysOffset: -45, approval: "not-required", tags: ["Design", "Exhibition"], description: "Cross-club exhibit pairing sustainability storytelling with design craft.", photo: `${BLOB}/club-events/portfolio-crit.png`, transparency: { outcome: "Cross-club collab exhibit, strong footfall.", spend: "₹12,000", attendance: "150" } },
  { clubSlug: "kalakriti", title: "Illustration Sprint: Campus Stories", status: "upcoming", venue: "Seminar Hall 3", going: 25, capacity: 50, daysOffset: 8, approval: "approved", tags: ["Design", "Sprint"], description: "A day-long illustration sprint documenting campus life, exhibited the following week.", photo: `${BLOB}/club-events/cat-robotics-team.jpg` },
  // ---- Prakriti Sustainability ----
  { clubSlug: "prakriti", title: "Campus Waste Audit Drive", status: "past", venue: "Meet at Main Gate", going: 40, capacity: 45, daysOffset: -25, approval: "not-required", tags: ["Volunteer"], description: "Full-campus waste segregation audit, findings compiled into a report for facilities.", photo: `${BLOB}/club-events/cat-football-match.jpg` },
  { clubSlug: "prakriti", title: "Climate Action Panel", status: "past", venue: "Seminar Hall 1", going: 70, capacity: 75, daysOffset: -15, approval: "not-required", tags: ["Panel"], description: "Panel discussion with campus sustainability office and two alumni founders.", photo: `${BLOB}/club-events/cat-mun-conference.jpg` },
  { clubSlug: "prakriti", title: "Tree Plantation Weekend", status: "upcoming", venue: "Campus Grounds", going: 55, capacity: 100, daysOffset: 9, approval: "approved", tags: ["Volunteer", "Campaign"], description: "Weekend plantation drive across the campus grounds, saplings and tools provided.", photo: `${BLOB}/club-events/climate-teach-in.png` },
  { clubSlug: "prakriti", title: "Sustainability Fair", status: "upcoming", venue: "OAT", going: 0, capacity: 150, daysOffset: 20, approval: "pending", tags: ["Fair"], description: "Stalls, workshops, and a repair cafe — campus-wide sustainability showcase.", photo: `${BLOB}/club-events/cat-football-match.jpg` },
  // ---- E-Cell IITM BS ----
  { clubSlug: "e-cell", title: "Founder Circle: Fundraising 101", status: "past", venue: "Seminar Hall 2", going: 60, capacity: 65, daysOffset: -28, approval: "not-required", tags: ["Founders"], description: "Alumni founder walks through a real pitch deck and term sheet, Q&A after.", photo: `${BLOB}/club-events/cat-mun-conference.jpg` },
  { clubSlug: "e-cell", title: "Startup Weekend", status: "past", venue: "CRC Auditorium", going: 210, capacity: 220, daysOffset: -50, approval: "not-required", tags: ["Flagship"], description: "54-hour build-a-startup weekend, culminating in pitches to a VC judging panel.", photo: `${BLOB}/club-events/ignite-2026.png`, transparency: { outcome: "18 teams pitched, 3 selected for incubation.", spend: "₹65,000", attendance: "210" } },
  { clubSlug: "e-cell", title: "Pitch Practice Fridays #9", status: "past", venue: "Online · Zoom", going: 35, capacity: 40, daysOffset: -10, approval: "not-required", tags: ["Practice"], description: "Rapid-fire two-minute pitch practice with peer feedback.", photo: `${BLOB}/club-events/hacktoberfest.jpg` },
  { clubSlug: "e-cell", title: "Ignite 2026 — Startup Weekend", status: "upcoming", venue: "IITM Research Park", going: 96, capacity: 300, daysOffset: 7, approval: "approved", tags: ["Flagship", "All-day"], description: "The club's flagship startup weekend — sponsor booths, mentor circuit, and a live pitch finale.", photo: `${BLOB}/club-events/ignite-2026.png` },
  { clubSlug: "e-cell", title: "Founder AMA: Series A Lessons", status: "upcoming", venue: "Seminar Hall 1", going: 0, capacity: 80, daysOffset: 25, approval: "pending", tags: ["Founders", "AMA"], description: "An alumna founder on what actually broke during her Series A, ask-anything format.", photo: `${BLOB}/club-events/cat-mun-conference.jpg` },
  // ---- Quill Writers' Circle ----
  { clubSlug: "quill", title: "Poetry Slam: Monsoon Verses", status: "past", venue: "Amphitheatre", going: 50, capacity: 55, daysOffset: -70, approval: "not-required", tags: ["Poetry"], description: "Open poetry slam, five-minute slots, judged by audience applause meter.", photo: `${BLOB}/club-events/cat-mun-conference.jpg` },
  { clubSlug: "quill", title: "Writing Sprint Saturday", status: "past", venue: "Seminar Hall 3", going: 22, capacity: 25, daysOffset: -55, approval: "not-required", tags: ["Sprint"], description: "Silent-writing sprints in 25-minute blocks, share-out at the end.", photo: `${BLOB}/club-events/hacktoberfest.jpg` },
  { clubSlug: "quill", title: "Longform Critique Circle #7", status: "upcoming", venue: "Seminar Hall 2", going: 18, capacity: 30, daysOffset: 35, approval: "approved", tags: ["Critique"], description: "Essay-length pieces workshopped in small groups, written feedback required in advance.", photo: `${BLOB}/club-events/cat-electronics-workshop.jpg` },
  { clubSlug: "quill", title: "Campus Anthology Launch", status: "upcoming", venue: "OAT", going: 0, capacity: 80, daysOffset: 45, approval: "pending", tags: ["Launch"], description: "Launch reading for this year's campus anthology, contributors read excerpts.", photo: `${BLOB}/club-events/cat-mun-conference.jpg` },
  // ---- Arena Chess Club ----
  { clubSlug: "arena", title: "Blitz Ladder Round 4", status: "past", venue: "Seminar Hall 1", going: 32, capacity: 35, daysOffset: -33, approval: "not-required", tags: ["Blitz", "Ladder"], description: "Round 4 of the ongoing blitz ladder, Swiss pairing, five-minute clocks.", photo: `${BLOB}/club-events/chess-blitz-x.png` },
  { clubSlug: "arena", title: "Team League: Semifinals", status: "past", venue: "Seminar Hall 3", going: 28, capacity: 30, daysOffset: -20, approval: "not-required", tags: ["League"], description: "Board-by-board semifinal match between the season's top two teams.", photo: `${BLOB}/club-events/cat-chess-tournament.jpg`, transparency: { outcome: "Close semifinal, decided on tiebreak.", spend: "₹0", attendance: "28" } },
  { clubSlug: "arena", title: "Bullet Chess Night", status: "upcoming", venue: "Seminar Hall 1", going: 40, capacity: 60, daysOffset: 5, approval: "approved", tags: ["Bullet"], description: "One-minute bullet chess, knockout bracket, arbiter on hand for disputes.", photo: `${BLOB}/club-events/chess-blitz-x.png` },
  { clubSlug: "arena", title: "Rating Ladder Round 5", status: "upcoming", venue: "Seminar Hall 3", going: 0, capacity: 50, daysOffset: 18, approval: "pending", tags: ["Ladder"], description: "Round 5 of the ongoing rating ladder, Swiss pairing.", photo: `${BLOB}/club-events/cat-chess-tournament.jpg` },
];

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
const eventSlug = (e: EventSpec) => `${slugify(e.title)}-${e.clubSlug}`;

// ---------- tasks (assigned to the 8 fictional volunteers, m11-m18) ----------
const VOLUNTEER_IDS: Record<string, string> = {
  "Rohan Kulkarni": "m11", "Ananya Krishnan": "m12", "Vivek Choudhary": "m13", "Divya Ramaswamy": "m14",
  "Arjun Malhotra": "m15", "Nisha Pillai": "m16", "Siddharth Bose": "m17", "Tanvi Agarwal": "m18",
};
interface TaskSpec { title: string; eventTitle: string; clubSlug: string; role: string; status: "todo" | "doing" | "done"; priority: "Low" | "Med" | "High"; assignee: string; dueInDays: number }
const TASKS: TaskSpec[] = [
  { title: "Registration desk setup", eventTitle: "Hack-a-Sangam 24h", clubSlug: "codechef", role: "Logistics", status: "done", priority: "Med", assignee: "Rohan Kulkarni", dueInDays: -15 },
  { title: "Sponsor booth coordination", eventTitle: "Ignite 2026 — Startup Weekend", clubSlug: "e-cell", role: "Coordination", status: "doing", priority: "High", assignee: "Ananya Krishnan", dueInDays: 3 },
  { title: "Sound check and mic setup", eventTitle: "Fusion Night VI — Sarga Live", clubSlug: "sarga", role: "Tech ops", status: "todo", priority: "Med", assignee: "Vivek Choudhary", dueInDays: 3 },
  { title: "Judge briefing document", eventTitle: "Hack-a-Sangam 24h", clubSlug: "codechef", role: "Coordination", status: "done", priority: "Med", assignee: "Divya Ramaswamy", dueInDays: -13 },
  { title: "Volunteer T-shirt distribution", eventTitle: "Startup Weekend", clubSlug: "e-cell", role: "Logistics", status: "done", priority: "Low", assignee: "Arjun Malhotra", dueInDays: -49 },
  { title: "Stage decoration", eventTitle: "Fusion Night VI — Sarga Live", clubSlug: "sarga", role: "Hospitality", status: "doing", priority: "Low", assignee: "Nisha Pillai", dueInDays: 3 },
  { title: "Waste segregation stations setup", eventTitle: "Campus Waste Audit Drive", clubSlug: "prakriti", role: "Logistics", status: "done", priority: "Med", assignee: "Siddharth Bose", dueInDays: -25 },
  { title: "Photography coverage", eventTitle: "Design Fest: Prakriti x Kalakriti Collab Showcase", clubSlug: "kalakriti", role: "Content", status: "done", priority: "Low", assignee: "Tanvi Agarwal", dueInDays: -45 },
  { title: "Security desk coordination", eventTitle: "BP Open Round", clubSlug: "paradox", role: "Logistics", status: "todo", priority: "Med", assignee: "Rohan Kulkarni", dueInDays: -2 },
  { title: "Certificate printing", eventTitle: "DSA Bootcamp: Trees & Graphs", clubSlug: "codechef", role: "Logistics", status: "todo", priority: "Low", assignee: "Ananya Krishnan", dueInDays: -1 },
  { title: "Livestream setup", eventTitle: "Weekly Cook-Off #48", clubSlug: "codechef", role: "Tech ops", status: "todo", priority: "Med", assignee: "Vivek Choudhary", dueInDays: 1 },
  { title: "Feedback form collection", eventTitle: "Founder Circle: Fundraising 101", clubSlug: "e-cell", role: "Content", status: "done", priority: "Low", assignee: "Divya Ramaswamy", dueInDays: -28 },
  { title: "Green room coordination", eventTitle: "Fusion Night VI — Sarga Live", clubSlug: "sarga", role: "Coordination", status: "todo", priority: "Low", assignee: "Arjun Malhotra", dueInDays: 4 },
  { title: "Seating arrangement", eventTitle: "Poetry Slam: Monsoon Verses", clubSlug: "quill", role: "Logistics", status: "done", priority: "Low", assignee: "Nisha Pillai", dueInDays: -71 },
  { title: "Chess board setup", eventTitle: "Blitz Ladder Round 4", clubSlug: "arena", role: "Logistics", status: "done", priority: "Med", assignee: "Siddharth Bose", dueInDays: -34 },
  { title: "Registration desk", eventTitle: "Ignite 2026 — Startup Weekend", clubSlug: "e-cell", role: "Logistics", status: "todo", priority: "Med", assignee: "Tanvi Agarwal", dueInDays: 5 },
  { title: "Banner printing coordination", eventTitle: "Illustration Sprint: Campus Stories", clubSlug: "kalakriti", role: "Content", status: "todo", priority: "Low", assignee: "Rohan Kulkarni", dueInDays: -4 },
  { title: "Motion cards printing", eventTitle: "BP Open Round II", clubSlug: "paradox", role: "Logistics", status: "todo", priority: "Low", assignee: "Ananya Krishnan", dueInDays: 12 },
  { title: "Merch table setup", eventTitle: "Weekly Cook-Off #48", clubSlug: "codechef", role: "Logistics", status: "doing", priority: "Low", assignee: "Vivek Choudhary", dueInDays: 2 },
  { title: "Judge coordination", eventTitle: "Rating Ladder Round 5", clubSlug: "arena", role: "Coordination", status: "todo", priority: "Med", assignee: "Divya Ramaswamy", dueInDays: 16 },
  { title: "Pitch deck printing", eventTitle: "Founder AMA: Series A Lessons", clubSlug: "e-cell", role: "Content", status: "todo", priority: "Low", assignee: "Arjun Malhotra", dueInDays: 22 },
  { title: "Open mic sign-up sheet", eventTitle: "Longform Critique Circle #7", clubSlug: "quill", role: "Coordination", status: "todo", priority: "Low", assignee: "Nisha Pillai", dueInDays: 30 },
  { title: "Tree sapling procurement", eventTitle: "Tree Plantation Weekend", clubSlug: "prakriti", role: "Logistics", status: "doing", priority: "Med", assignee: "Siddharth Bose", dueInDays: 6 },
  { title: "Portfolio wall labels", eventTitle: "Illustration Sprint: Campus Stories", clubSlug: "kalakriti", role: "Content", status: "done", priority: "Low", assignee: "Tanvi Agarwal", dueInDays: -1 },
  { title: "Sustainability Fair volunteer roster", eventTitle: "Sustainability Fair", clubSlug: "prakriti", role: "Coordination", status: "todo", priority: "Med", assignee: "Rohan Kulkarni", dueInDays: 18 },
];

// ---------- announcements ----------
interface AnnouncementSpec { title: string; body: string; clubSlug: string; audience: "All" | "Coordinators" | "Volunteers"; priority: "Low" | "Med" | "High"; pinned: boolean; daysAgo: number; authorMemberId: string }
const ANNOUNCEMENTS: AnnouncementSpec[] = [
  { title: "Fusion Night VI — Sarga Live, this Thursday, 7 PM", body: "Doors open 6:30, six acts, closing jam open to anyone on stage.", clubSlug: "sarga", audience: "All", priority: "High", pinned: true, daysAgo: 1.2, authorMemberId: "m3" },
  { title: "Registration for Ignite 2026 closes Wednesday", body: "If you're pitching or just attending, lock in your spot before the cutoff.", clubSlug: "e-cell", audience: "All", priority: "High", pinned: true, daysAgo: 2.0, authorMemberId: "m1" },
  { title: "Weekly Cook-Off moved to Discord voice channel #3", body: "Channel #2 is double-booked with another event's stream — join #3 instead.", clubSlug: "codechef", audience: "All", priority: "Med", pinned: false, daysAgo: 0.5, authorMemberId: "m1" },
  { title: "Volunteers: mandatory briefing before Hack-a-Sangam", body: "All assigned volunteers must attend Wednesday's briefing to get shift assignments.", clubSlug: "codechef", audience: "Volunteers", priority: "High", pinned: false, daysAgo: 3.4, authorMemberId: "m5" },
  { title: "New coordinators onboarding this Friday", body: "Walkthrough of the approval queue and the volunteer task board for new coordinators.", clubSlug: "paradox", audience: "Coordinators", priority: "Med", pinned: false, daysAgo: 4.1, authorMemberId: "m2" },
  { title: "Portfolio submissions open for Kalakriti showcase", body: "Submit up to three pieces for next month's showcase wall — deadline Sunday.", clubSlug: "kalakriti", audience: "All", priority: "Med", pinned: false, daysAgo: 2.8, authorMemberId: "m4" },
  { title: "Campus Waste Audit rescheduled to Saturday", body: "Weather pushed the audit to Saturday morning — same meeting point at the main gate.", clubSlug: "prakriti", audience: "All", priority: "High", pinned: true, daysAgo: 5.3, authorMemberId: "m4" },
  { title: "Founder Circle applications closing soon", body: "This cohort's founder circle applications close end of week — apply in the club channel.", clubSlug: "e-cell", audience: "All", priority: "Med", pinned: false, daysAgo: 6.6, authorMemberId: "m1" },
  { title: "Poetry Slam theme announced: Monsoon Verses", body: "This edition's theme is monsoon — five-minute slots, sign up at the door.", clubSlug: "quill", audience: "All", priority: "Low", pinned: false, daysAgo: 8.9, authorMemberId: "m2" },
  { title: "Rating Ladder Round 5 pairings out", body: "Pairings for round 5 are posted on the board and in the club channel.", clubSlug: "arena", audience: "All", priority: "Med", pinned: false, daysAgo: 1.9, authorMemberId: "m3" },
  { title: "BP Open Round venue changed to Seminar Hall 3", body: "Original venue got double-booked — same time, new room.", clubSlug: "paradox", audience: "All", priority: "High", pinned: true, daysAgo: 3.0, authorMemberId: "m2" },
  { title: "Sarga jam session this weekend, all welcome", body: "Casual open jam, bring an instrument or just your voice. No auditions.", clubSlug: "sarga", audience: "All", priority: "Low", pinned: false, daysAgo: 7.5, authorMemberId: "m3" },
  { title: "Volunteer sign-ups open for Ignite 2026", body: "Looking for volunteers across registration, sponsor booths, and stage management.", clubSlug: "e-cell", audience: "Volunteers", priority: "Med", pinned: false, daysAgo: 4.7, authorMemberId: "m1" },
  { title: "Design Fest collab planning meeting", body: "Planning meeting for the next cross-club showcase — coordinators only.", clubSlug: "kalakriti", audience: "Coordinators", priority: "Med", pinned: false, daysAgo: 9.2, authorMemberId: "m4" },
];

// ---------- issues ----------
interface IssueSpec { title: string; category: "Registration" | "Payment" | "Booking" | "Access" | "Other"; status: "Open" | "InProgress" | "Resolved"; priority: "Low" | "Med" | "High"; clubSlug: string; daysAgo: number; raisedByOffset: number; assigned: boolean }
const ISSUES: IssueSpec[] = [
  { title: "Can't check in for Weekly Cook-Off", category: "Registration", status: "Open", priority: "High", clubSlug: "codechef", daysAgo: 2.1, raisedByOffset: 0, assigned: false },
  { title: "Payment for merchandise not reflecting", category: "Payment", status: "InProgress", priority: "Med", clubSlug: "sarga", daysAgo: 5.6, raisedByOffset: 1, assigned: true },
  { title: "Unable to book Seminar Hall for practice session", category: "Booking", status: "Open", priority: "Med", clubSlug: "paradox", daysAgo: 8.2, raisedByOffset: 2, assigned: false },
  { title: "Lost access to club Discord after role change", category: "Access", status: "Resolved", priority: "High", clubSlug: "codechef", daysAgo: 14.9, raisedByOffset: 3, assigned: true },
  { title: "Wrong event time shown on my dashboard", category: "Registration", status: "Open", priority: "Low", clubSlug: "kalakriti", daysAgo: 1.4, raisedByOffset: 4, assigned: false },
  { title: "Refund request for cancelled workshop", category: "Payment", status: "InProgress", priority: "Med", clubSlug: "kalakriti", daysAgo: 6.8, raisedByOffset: 5, assigned: true },
  { title: "Can't upload avatar image", category: "Access", status: "Resolved", priority: "Low", clubSlug: "prakriti", daysAgo: 20.3, raisedByOffset: 6, assigned: false },
  { title: "Duplicate registration for BP Open Round", category: "Registration", status: "Resolved", priority: "Low", clubSlug: "paradox", daysAgo: 30.1, raisedByOffset: 7, assigned: false },
  { title: "Task assignment notification not received", category: "Other", status: "Open", priority: "Med", clubSlug: "e-cell", daysAgo: 3.7, raisedByOffset: 8, assigned: false },
  { title: "Requesting change of assigned volunteer role", category: "Other", status: "InProgress", priority: "Low", clubSlug: "prakriti", daysAgo: 9.5, raisedByOffset: 9, assigned: true },
  { title: "Event capacity showing incorrect count", category: "Booking", status: "Open", priority: "High", clubSlug: "e-cell", daysAgo: 4.4, raisedByOffset: 10, assigned: false },
  { title: "Announcement email not delivered", category: "Other", status: "Resolved", priority: "Med", clubSlug: "sarga", daysAgo: 12.6, raisedByOffset: 11, assigned: true },
  { title: "Unable to withdraw from club", category: "Access", status: "Open", priority: "Low", clubSlug: "quill", daysAgo: 18.0, raisedByOffset: 12, assigned: false },
  { title: "Certificate not generated after event", category: "Other", status: "InProgress", priority: "Med", clubSlug: "arena", daysAgo: 7.1, raisedByOffset: 13, assigned: true },
  { title: "Incorrect attendance marked for me", category: "Registration", status: "Open", priority: "High", clubSlug: "codechef", daysAgo: 2.9, raisedByOffset: 14, assigned: false },
];
// Plain-member pool for raisedBy (m19..m38 are the 20 "Members" tier, indices 18..37 in `members`).
const PLAIN_MEMBER_IDS = members.filter((m) => m.tier === "member").map((m) => m.id);
const COORD_ADMIN_IDS = members.filter((m) => m.tier === "coordinator" || m.tier === "admin").map((m) => m.id);

// ================= serialization =================
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const today = new Date();
function fmtDate(daysOffset: number): { date: string; isoDate: string } {
  const d = new Date(today.getTime() + daysOffset * 86400000);
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const isoDate = d.toISOString().slice(0, 10);
  return { date, isoDate };
}
const COVER_BY_CLUB: Record<string, string> = {
  codechef: "linear-gradient(135deg,#d4ff3a 0%,#22d3ee 100%)",
  paradox: "linear-gradient(135deg,#ff4d8f 0%,#a855f7 100%)",
  sarga: "linear-gradient(135deg,#7c3aed 0%,#ec4899 60%,#f97316 100%)",
  kalakriti: "linear-gradient(135deg,#eab308 0%,#84cc16 100%)",
  prakriti: "linear-gradient(135deg,#22c55e 0%,#0891b2 100%)",
  "e-cell": "linear-gradient(135deg,#f97316 0%,#eab308 100%)",
  quill: "linear-gradient(135deg,#ec4899 0%,#a855f7 100%)",
  arena: "linear-gradient(135deg,#ef4444 0%,#7c3aed 100%)",
};

let out = "";
out += `// Seed dataset for prisma/seed.ts. Also the source for content that was\n`;
out += `// deliberately kept static rather than modeled as a DB table (FAQ copy,\n`;
out += `// and the landing page's decorative dashboard-preview mockup).\n`;
out += `//\n`;
out += `// Generated by scripts/generate-seed-data.ts — regenerate with\n`;
out += `// \`bun run scripts/generate-seed-data.ts\` rather than hand-editing bulk\n`;
out += `// content below. All dates are stored as offsets (daysAgo / daysOffset /\n`;
out += `// daysInDays), resolved against Date.now() at prisma/seed.ts run time, so\n`;
out += `// this dataset never goes stale. Team accounts (Alok/Vishal/Pardhiv/\n`;
out += `// Purnendu/Ashish) are seeded separately, directly in prisma/seed.ts.\n\n`;

out += `export type ClubCategory = "Technical" | "Cultural" | "Sports" | "Entrepreneurship" | "Literary" | "Social" | "Design";\n\n`;
out += `export interface Club {\n  id: string;\n  slug: string;\n  name: string;\n  tagline: string;\n  category: ClubCategory;\n  members: number;\n  active: boolean;\n  hue: string;\n  emoji: string;\n  lastEvent: string;\n  founded: string;\n  description: string;\n  banner: string;\n  photo?: string;\n}\n\n`;
out += `function clubGradient(hue: string): string {\n  return \`linear-gradient(135deg, oklch(0.32 0.09 \${hue}) 0%, oklch(0.15 0.04 \${hue}) 100%)\`;\n}\n\n`;

// club member counts from generated memberships
const clubMemberCounts: Record<string, number> = Object.fromEntries(CLUB_SLUGS.map((s) => [s, 0]));
for (const m of members) for (const ms of m.memberships) if (ms.status !== "Pending") clubMemberCounts[ms.clubSlug]++;
const clubLastEvent: Record<string, string> = {};
for (const slug of CLUB_SLUGS) {
  const clubEvents = EVENTS.filter((e) => e.clubSlug === slug && e.daysOffset <= 0).sort((a, b) => b.daysOffset - a.daysOffset);
  const mostRecent = clubEvents[0];
  if (!mostRecent) { clubLastEvent[slug] = "no recent activity"; continue; }
  const days = Math.abs(mostRecent.daysOffset);
  clubLastEvent[slug] = days < 14 ? `${days} days ago` : days < 60 ? `${Math.round(days / 7)} weeks ago` : `${Math.round(days / 30)} months ago`;
}

out += `export const clubs: Club[] = [\n`;
for (const c of CLUBS) {
  out += `  { id: "${c.id}", slug: "${c.slug}", name: "${esc(c.name)}", tagline: "${esc(c.tagline)}", category: "${c.category}", members: ${clubMemberCounts[c.slug]}, active: ${c.active}, hue: "${c.hue}", emoji: "${c.emoji}", lastEvent: "${clubLastEvent[c.slug]}", founded: "${c.founded}", description: "${esc(c.description)}", banner: clubGradient("${c.hue}"), photo: "${c.photo}" },\n`;
}
out += `];\n\n`;

out += `export type EventStatus = "upcoming" | "live" | "past";\n`;
out += `export interface Event {\n  id: string;\n  slug: string;\n  title: string;\n  clubSlug: string;\n  club: string;\n  date: string;\n  isoDate: string;\n  daysOffset: number;\n  time: string;\n  venue: string;\n  status: EventStatus;\n  going: number;\n  capacity: number;\n  cover: string;\n  photo?: string;\n  tags: string[];\n  description: string;\n  approval: "approved" | "pending" | "not-required" | "rejected";\n}\n\n`;

out += `export const events: Event[] = [\n`;
const TIMES = ["9:00 AM", "10:00 AM", "2:00 PM", "5:00 PM", "6:30 PM", "7:00 PM", "9:00 PM"];
EVENTS.forEach((e, i) => {
  const club = clubBySlug.get(e.clubSlug)!;
  const { date, isoDate } = fmtDate(e.daysOffset);
  const id = `e${i + 1}`;
  const slug = eventSlug(e);
  const time = TIMES[i % TIMES.length];
  const tagsStr = JSON.stringify(e.tags);
  const photoStr = e.photo ? `"${e.photo}"` : "undefined";
  out += `  { id: "${id}", slug: "${slug}", title: "${esc(e.title)}", clubSlug: "${e.clubSlug}", club: "${esc(club.name)}", date: "${date}", isoDate: "${isoDate}", daysOffset: ${e.daysOffset}, time: "${time}", venue: "${esc(e.venue)}", status: "${e.status}", going: ${e.going}, capacity: ${e.capacity}, cover: "${COVER_BY_CLUB[e.clubSlug]}", photo: ${photoStr}, tags: ${tagsStr}, description: "${esc(e.description)}", approval: "${e.approval}" },\n`;
});
out += `];\n\n`;

out += `export interface EventAttendee {\n  eventSlug: string;\n  memberId: string;\n  checkedIn: boolean;\n  registeredDaysAgo: number;\n}\n`;
out += `export const eventAttendees: EventAttendee[] = [\n`;
// A modest, deterministic set of registrations per event (not required to match `going` exactly — that's a static display field).
EVENTS.forEach((e) => {
  const slug = eventSlug(e);
  const clubMembers = members.filter((m) => m.memberships.some((ms) => ms.clubSlug === e.clubSlug));
  const pool = clubMembers.length > 0 ? clubMembers : members;
  const n = Math.min(6, pool.length);
  for (let i = 0; i < n; i++) {
    const m = pool[(i * 7) % pool.length];
    const checkedIn = e.status === "past";
    const registeredDaysAgo = e.status === "past" ? Math.abs(e.daysOffset) + i + 1 : Math.max(1, i);
    out += `  { eventSlug: "${slug}", memberId: "${m.id}", checkedIn: ${checkedIn}, registeredDaysAgo: ${registeredDaysAgo} },\n`;
  }
});
out += `];\n\n`;

out += `export interface Announcement {\n  id: string;\n  title: string;\n  body: string;\n  clubSlug: string;\n  club: string;\n  authorId: string;\n  daysAgo: number;\n  pinned: boolean;\n  audience: "All" | "Coordinators" | "Volunteers";\n  priority: "Low" | "Med" | "High";\n}\n`;
out += `export const announcements: Announcement[] = [\n`;
ANNOUNCEMENTS.forEach((a, i) => {
  const club = clubBySlug.get(a.clubSlug)!;
  out += `  { id: "a${i + 1}", title: "${esc(a.title)}", body: "${esc(a.body)}", clubSlug: "${a.clubSlug}", club: "${esc(club.name)}", authorId: "${a.authorMemberId}", daysAgo: ${a.daysAgo}, pinned: ${a.pinned}, audience: "${a.audience}", priority: "${a.priority}" },\n`;
});
out += `];\n\n`;

out += `export interface Issue {\n  id: string;\n  title: string;\n  category: "Registration" | "Payment" | "Booking" | "Access" | "Other";\n  status: "Open" | "InProgress" | "Resolved";\n  raisedById: string;\n  assigneeId?: string;\n  clubSlug?: string;\n  daysAgo: number;\n  priority: "Low" | "Med" | "High";\n}\n`;
out += `export const issues: Issue[] = [\n`;
ISSUES.forEach((iss, i) => {
  const raisedBy = PLAIN_MEMBER_IDS[iss.raisedByOffset % PLAIN_MEMBER_IDS.length];
  const assigneePart = iss.assigned ? `, assigneeId: "${COORD_ADMIN_IDS[i % COORD_ADMIN_IDS.length]}"` : "";
  out += `  { id: "i${i + 1}", title: "${esc(iss.title)}", category: "${iss.category}", status: "${iss.status}", raisedById: "${raisedBy}"${assigneePart}, clubSlug: "${iss.clubSlug}", daysAgo: ${iss.daysAgo}, priority: "${iss.priority}" },\n`;
});
out += `];\n\n`;

out += `export interface Task {\n  id: string;\n  title: string;\n  eventSlug: string;\n  role: string;\n  status: "todo" | "doing" | "done";\n  priority: "Low" | "Med" | "High";\n  assigneeId: string;\n  dueInDays: number;\n}\n`;
out += `export const tasks: Task[] = [\n`;
const eventSlugByTitleClub = new Map(EVENTS.map((e) => [`${e.clubSlug}::${e.title}`, eventSlug(e)]));
TASKS.forEach((t, i) => {
  const slug = eventSlugByTitleClub.get(`${t.clubSlug}::${t.eventTitle}`);
  if (!slug) throw new Error(`No event found for task "${t.title}" -> "${t.eventTitle}" (${t.clubSlug})`);
  const assigneeId = VOLUNTEER_IDS[t.assignee];
  out += `  { id: "t${i + 1}", title: "${esc(t.title)}", eventSlug: "${slug}", role: "${esc(t.role)}", status: "${t.status}", priority: "${t.priority}", assigneeId: "${assigneeId}", dueInDays: ${t.dueInDays} },\n`;
});
out += `];\n\n`;

out += `export interface Contribution {\n  id: string;\n  eventSlug: string;\n  role: string;\n  hoursLogged: number;\n  verifiedDaysAgo: number;\n  memberId: string;\n}\n`;
out += `export const contributions: Contribution[] = [\n`;
let vCounter = 1;
TASKS.filter((t) => t.status === "done").forEach((t) => {
  const slug = eventSlugByTitleClub.get(`${t.clubSlug}::${t.eventTitle}`)!;
  const assigneeId = VOLUNTEER_IDS[t.assignee];
  const hours = 3 + ((vCounter * 7) % 10);
  out += `  { id: "v${vCounter}", eventSlug: "${slug}", role: "${esc(t.role)}", hoursLogged: ${hours}, verifiedDaysAgo: ${Math.max(t.dueInDays + 1, -80)}, memberId: "${assigneeId}" },\n`;
  vCounter++;
});
out += `];\n\n`;

out += `export interface ClubMembership {\n  clubSlug: string;\n  role: "Member" | "Volunteer" | "Coordinator" | "Admin";\n  status: "Active" | "Pending" | "Inactive";\n  joinedDaysAgo: number;\n}\n`;
out += `export interface Member {\n  id: string;\n  name: string;\n  roll: string;\n  avatar: string;\n  interests: string[];\n  memberships: ClubMembership[];\n}\n`;
out += `export const members: Member[] = [\n`;
members.forEach((m) => {
  const interests = interestsFor(m);
  const hue = clubBySlug.get(m.memberships[0].clubSlug)!.hue;
  const membershipsStr = m.memberships.map((ms) => `{ clubSlug: "${ms.clubSlug}", role: "${ms.role}", status: "${ms.status}", joinedDaysAgo: ${ms.joinedDaysAgo} }`).join(", ");
  out += `  { id: "${m.id}", name: "${esc(m.name)}", roll: "${m.roll}", avatar: "${hue}", interests: ${JSON.stringify(interests)}, memberships: [${membershipsStr}] },\n`;
});
out += `];\n\n`;

out += `export interface FacultyMember {\n  id: string;\n  name: string;\n  email: string;\n}\n`;
out += `export const faculty: FacultyMember[] = [\n`;
faculty.forEach((f) => { out += `  { id: "${f.id}", name: "${esc(f.name)}", email: "${f.email}" },\n`; });
out += `];\n\n`;

out += `export const faqs = [\n`;
out += `  { q: "How do I join a club?", a: "Head to Browse Clubs, pick one, hit Join. Some clubs auto-approve; others need admin approval and you'll get a status update." },\n`;
out += `  { q: "What if two events I want clash?", a: "Sangam flags conflicts on your dashboard. You can count yourself in for both - attendance is checked in separately - but organizers see who's double-booked." },\n`;
out += `  { q: "How does event approval work?", a: "Small events go live instantly. Anything requiring venue booking, funds, or off-campus travel routes to the faculty coordinator queue." },\n`;
out += `  { q: "Can I be a member of multiple clubs?", a: "Yes. Most students are in 2–3. Your dashboard filters announcements to only clubs you belong to." },\n`;
out += `  { q: "Where do bulk imports live?", a: "Admin → Members → Import CSV. Template is downloadable. Duplicate roll numbers are skipped, not overwritten." },\n`;
out += `  { q: "I found a bug. What do I do?", a: "Raise an issue from your dashboard. High-priority tickets ping the platform admin directly." },\n`;
out += `];\n\n`;

out += `export const resources = [\n`;
out += `  { id: "r1", name: "Amphitheatre", type: "Venue", capacity: 300, availability: "Booked Fri 7 PM" },\n`;
out += `  { id: "r2", name: "Seminar Hall 1", type: "Venue", capacity: 80, availability: "Available" },\n`;
out += `  { id: "r3", name: "Seminar Hall 2", type: "Venue", capacity: 70, availability: "Available" },\n`;
out += `  { id: "r4", name: "Seminar Hall 3", type: "Venue", capacity: 60, availability: "Available" },\n`;
out += `  { id: "r5", name: "CRC Auditorium", type: "Venue", capacity: 320, availability: "Pending confirmation" },\n`;
out += `  { id: "r6", name: "OAT", type: "Venue", capacity: 150, availability: "Available" },\n`;
out += `  { id: "r7", name: "Common Room", type: "Venue", capacity: 80, availability: "Available" },\n`;
out += `  { id: "r8", name: "Projector - Epson 4K", type: "Equipment", capacity: 1, availability: "Available" },\n`;
out += `  { id: "r9", name: "PA System - Yamaha", type: "Equipment", capacity: 1, availability: "Booked Sat" },\n`;
out += `  { id: "r10", name: "DSLR Kit - Canon", type: "Equipment", capacity: 2, availability: "Pending confirmation" },\n`;
out += `];\n\n`;

const totalMembers = members.length + faculty.length + 5; // + 5 real team accounts
const openIssues = ISSUES.filter((i) => i.status !== "Resolved").length;
const eventsThisMonth = EVENTS.filter((e) => Math.abs(e.daysOffset) <= 30).length;
out += `export const metrics = {\n`;
out += `  totalMembers: ${totalMembers},\n`;
out += `  activeMembers: ${totalMembers - 3},\n`;
out += `  eventsThisMonth: ${eventsThisMonth},\n`;
out += `  openIssues: ${openIssues},\n`;
out += `  weeklyAttendance: [21, 19, 14, 12, 16, 10, 199],\n`;
out += `  clubGrowth: [\n`;
CLUBS.forEach((c, i) => { out += `    { club: "${c.name.split(" ")[0]}", growth: ${[23, 4, 12, 3, 4, 16, -2, 6][i]} },\n`; });
out += `  ],\n`;
out += `};\n\n`;

out += `export interface TransparencyEntry {\n  id: string;\n  eventSlug: string;\n  eventName: string;\n  outcome: string;\n  daysAgo: number;\n  clubSlug: string;\n  spend: string;\n  attendance: string;\n}\n`;
out += `export const transparencyLog: TransparencyEntry[] = [\n`;
let lCounter = 1;
EVENTS.forEach((e) => {
  if (!e.transparency) return;
  const slug = eventSlug(e);
  const club = clubBySlug.get(e.clubSlug)!;
  out += `  { id: "l${lCounter}", eventSlug: "${slug}", eventName: "${esc(e.title)} · ${esc(club.name)}", outcome: "${esc(e.transparency.outcome)}", daysAgo: ${Math.abs(e.daysOffset)}, clubSlug: "${e.clubSlug}", spend: "${e.transparency.spend}", attendance: "${e.transparency.attendance}" },\n`;
  lCounter++;
});
out += `];\n`;

writeFileSync(path.join(process.cwd(), "lib", "seed-data.ts"), out, "utf8");
console.log(`Wrote lib/seed-data.ts — ${members.length} fictional members, ${EVENTS.length} events, ${TASKS.length} tasks, ${ANNOUNCEMENTS.length} announcements, ${ISSUES.length} issues, ${lCounter - 1} transparency entries.`);
