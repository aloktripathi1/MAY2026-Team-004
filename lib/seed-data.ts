// Seed dataset for prisma/seed.ts. Also the source for content that was
// deliberately kept static rather than modeled as a DB table (FAQ copy,
// and the landing page's decorative dashboard-preview mockup).

export type ClubCategory = "Technical" | "Cultural" | "Sports" | "Entrepreneurship" | "Literary" | "Social" | "Design";

export interface Club {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: ClubCategory;
  members: number;
  active: boolean;
  hue: string; // css color for accent per club
  emoji: string;
  lastEvent: string;
  founded: string;
  description: string;
  banner: string;
}

// Category/theme-relevant photo per club (loremflickr.com keyword search,
// not just a random image) with a lock=<n> so the same photo keeps coming
// back for a given club instead of reshuffling on every reload/rebuild.
function bannerFor(keywords: string, lock: number): string {
  return `https://loremflickr.com/800/450/${keywords}?lock=${lock}`;
}

export const clubs: Club[] = [
  { id: "c1", slug: "codechef", name: "CodeChef IITM BS", tagline: "Competitive programming, weekly contests.", category: "Technical", members: 412, active: true, hue: "122", emoji: "◉", lastEvent: "2 days ago", founded: "2021", description: "Weekly cook-offs, algorithm deep-dives, and interview prep circles. Home for anyone who thinks in edge cases.", banner: bannerFor("laptop,code", 1) },
  { id: "c2", slug: "paradox", name: "Paradox — Debate Society", tagline: "Parliamentary debate & MUN circuit.", category: "Literary", members: 186, active: true, hue: "5", emoji: "❋", lastEvent: "5 days ago", founded: "2020", description: "British Parliamentary, Asians, and MUN training. Weekly practice rounds. Traveling squad.", banner: bannerFor("microphone,speech", 2) },
  { id: "c3", slug: "sarga", name: "Sarga — Music Circle", tagline: "Fusion, jams, semester showcases.", category: "Cultural", members: 234, active: true, hue: "260", emoji: "♪", lastEvent: "1 week ago", founded: "2019", description: "Instrumentalists, vocalists, producers. Open jam every Friday, big fusion show every semester.", banner: bannerFor("concert,music", 3) },
  { id: "c4", slug: "kalakriti", name: "Kalakriti Design Guild", tagline: "Product, UI, illustration critique.", category: "Design", members: 98, active: true, hue: "85", emoji: "◐", lastEvent: "3 days ago", founded: "2022", description: "Portfolio reviews, Figma workshops, brand studies. Cross-pollination with product & marketing.", banner: bannerFor("design,art", 4) },
  { id: "c5", slug: "prakriti", name: "Prakriti — Sustainability", tagline: "Campus greening & climate action.", category: "Social", members: 156, active: true, hue: "155", emoji: "❦", lastEvent: "4 days ago", founded: "2021", description: "Zero-waste campaigns, tree drives, and climate literacy workshops for local schools.", banner: bannerFor("nature,recycling", 5) },
  { id: "c6", slug: "e-cell", name: "E-Cell IITM BS", tagline: "Founder circles & startup weekends.", category: "Entrepreneurship", members: 289, active: true, hue: "45", emoji: "◈", lastEvent: "Yesterday", founded: "2019", description: "Pitch nights, mentor office hours, and the annual Ignite startup weekend. Alumni founder network.", banner: bannerFor("startup,business", 6) },
  { id: "c7", slug: "quill", name: "Quill — Writers' Circle", tagline: "Prose, poetry, longform criticism.", category: "Literary", members: 74, active: false, hue: "320", emoji: "✦", lastEvent: "3 weeks ago", founded: "2022", description: "Monthly zine, workshop rounds, and reading nights. Fiction, poetry, essays, all welcome.", banner: bannerFor("books,writing", 7) },
  { id: "c8", slug: "arena", name: "Arena — Chess Club", tagline: "Blitz, bullet, and team leagues.", category: "Sports", members: 143, active: true, hue: "0", emoji: "♞", lastEvent: "6 days ago", founded: "2020", description: "Weekly blitz nights, inter-college leagues, opening prep clinics. Beginners always welcome.", banner: bannerFor("chess", 8) },
];

export type EventStatus = "upcoming" | "live" | "past";
export interface Event {
  id: string;
  slug: string;
  title: string;
  clubSlug: string;
  club: string;
  date: string; // display date
  isoDate: string;
  time: string;
  venue: string;
  status: EventStatus;
  going: number;
  capacity: number;
  cover: string; // gradient token, used on live event pages
  photo: string; // real theme-relevant photo, used on the landing page preview
  tags: string[];
  description: string;
  approval: "approved" | "pending" | "not-required" | "rejected";
}

// Theme-relevant photo per event (loremflickr.com keyword search) with a
// lock=<n> so the same photo keeps coming back instead of reshuffling.
function photoFor(keywords: string, lock: number): string {
  return `https://loremflickr.com/800/450/${keywords}?lock=${lock}`;
}

export const events: Event[] = [
  { id: "e1", slug: "fusion-night-vi", title: "Fusion Night VI — Sarga Live", clubSlug: "sarga", club: "Sarga — Music Circle", date: "Sat, Jul 11", isoDate: "2026-07-11", time: "7:00 PM", venue: "Amphitheatre", status: "upcoming", going: 187, capacity: 300, cover: "linear-gradient(135deg,#7c3aed 0%,#ec4899 60%,#f97316 100%)", photo: photoFor("concert,stage", 11), tags: ["Music", "Open"], description: "The sixth edition of Sarga's flagship fusion showcase. Six acts, one hour of chaos, one hour of soul. BYO glowsticks.", approval: "approved" },
  { id: "e2", slug: "cook-off-42", title: "Weekly Cook-Off #42", clubSlug: "codechef", club: "CodeChef IITM BS", date: "Sun, Jul 12", isoDate: "2026-07-12", time: "9:00 PM", venue: "Online · Discord", status: "upcoming", going: 218, capacity: 500, cover: "linear-gradient(135deg,#d4ff3a 0%,#22d3ee 100%)", photo: photoFor("programming", 205), tags: ["Contest", "Online"], description: "Four problems, two hours, one leaderboard. Editorial released 10 minutes after end. Top 5 get merch.", approval: "not-required" },
  { id: "e3", slug: "ignite-2026", title: "Ignite 2026 — Startup Weekend", clubSlug: "e-cell", club: "E-Cell IITM BS", date: "Fri–Sun, Jul 17–19", isoDate: "2026-07-17", time: "All day", venue: "IITM Research Park", status: "upcoming", going: 96, capacity: 120, cover: "linear-gradient(135deg,#fb923c 0%,#f43f5e 100%)", photo: photoFor("startup", 303), tags: ["Flagship", "Sponsored"], description: "54 hours. Idea → prototype → pitch. Ten mentors, five judges, one grand prize. Faculty sign-off in progress.", approval: "pending" },
  { id: "e4", slug: "bp-open-round", title: "BP Open Round · Paradox", clubSlug: "paradox", club: "Paradox — Debate Society", date: "Tue, Jul 14", isoDate: "2026-07-14", time: "6:30 PM", venue: "Seminar Hall 3", status: "upcoming", going: 42, capacity: 60, cover: "linear-gradient(135deg,#ff4d8f 0%,#a855f7 100%)", photo: photoFor("argument,discussion", 204), tags: ["Debate"], description: "British Parliamentary format. Motions announced 15 minutes before each round. First-timers get partnered with seniors.", approval: "approved" },
  { id: "e5", slug: "portfolio-crit", title: "Portfolio Crit Night", clubSlug: "kalakriti", club: "Kalakriti Design Guild", date: "Wed, Jul 15", isoDate: "2026-07-15", time: "8:00 PM", venue: "Studio B · Online hybrid", status: "upcoming", going: 31, capacity: 50, cover: "linear-gradient(135deg,#eab308 0%,#84cc16 100%)", photo: photoFor("sketchbook", 15), tags: ["Design", "Hybrid"], description: "Bring three screens or one case study. Ten-minute slots, brutally honest, brutally kind.", approval: "approved" },
  { id: "e6", slug: "climate-teach-in", title: "Climate Teach-In · Local Schools", clubSlug: "prakriti", club: "Prakriti — Sustainability", date: "Thu, Jul 16", isoDate: "2026-07-16", time: "10:00 AM", venue: "Off-campus · Adyar", status: "upcoming", going: 24, capacity: 40, cover: "linear-gradient(135deg,#22c55e 0%,#0891b2 100%)", photo: photoFor("classroom", 16), tags: ["Volunteer"], description: "Half-day teach-in at two neighborhood schools. Materials provided. Volunteers get transport reimbursement.", approval: "approved" },
  { id: "e7", slug: "chess-blitz-x", title: "Chess Blitz X · Arena", clubSlug: "arena", club: "Arena — Chess Club", date: "Sat, Jul 4", isoDate: "2026-07-04", time: "5:00 PM", venue: "Common Room", status: "past", going: 78, capacity: 80, cover: "linear-gradient(135deg,#334155 0%,#0f172a 100%)", photo: photoFor("chess", 17), tags: ["Sports"], description: "Nine rounds, 3+2 time control. Won by third-year Aarav Sen on tiebreaks.", approval: "not-required" },
  { id: "e8", slug: "sarga-open-jam", title: "Sarga Open Jam — June", clubSlug: "sarga", club: "Sarga — Music Circle", date: "Fri, Jun 27", isoDate: "2026-06-27", time: "7:30 PM", venue: "Amphitheatre", status: "past", going: 143, capacity: 150, cover: "linear-gradient(135deg,#7c3aed 0%,#ec4899 100%)", photo: photoFor("guitar", 18), tags: ["Music"], description: "Twelve acts, one open mic. Recording available on the club drive.", approval: "not-required" },
  { id: "e9", slug: "zine-launch-night", title: "Zine Launch Night · Quill", clubSlug: "quill", club: "Quill — Writers' Circle", date: "Fri, Jul 18", isoDate: "2026-07-18", time: "6:00 PM", venue: "Library Courtyard", status: "upcoming", going: 22, capacity: 60, cover: "linear-gradient(135deg,#a855f7 0%,#ec4899 100%)", photo: photoFor("books,writing", 19), tags: ["Literary", "Open"], description: "Launch of the summer zine, print copies handed out at the door. Off-campus vendor for printing, needs faculty sign-off.", approval: "pending" },
  { id: "e10", slug: "inter-college-chess-meet", title: "Inter-College Chess Meet · Arena", clubSlug: "arena", club: "Arena — Chess Club", date: "Sat, Jul 19", isoDate: "2026-07-19", time: "10:00 AM", venue: "Off-campus · Chennai", status: "upcoming", going: 18, capacity: 30, cover: "linear-gradient(135deg,#334155 0%,#0f172a 100%)", photo: photoFor("chess", 20), tags: ["Sports", "Travel"], description: "Away fixture against three other campuses. Bus transport and away-day insurance need faculty approval before booking.", approval: "pending" },
];

export interface Announcement {
  id: string;
  title: string;
  body: string;
  clubSlug: string;
  club: string;
  timeAgo: string;
  pinned?: boolean;
  audience?: "All" | "Coordinators" | "Volunteers";
}
export const announcements: Announcement[] = [
  { id: "a1", title: "Ignite 2026 registrations close Wednesday", body: "120 seats. 96 filled. If you're pitching, submit your one-liner by Tue 11 PM or you forfeit the slot.", clubSlug: "e-cell", club: "E-Cell IITM BS", timeAgo: "2h", pinned: true },
  { id: "a2", title: "Fusion Night — final rehearsal moved to Friday 8 PM", body: "Amphitheatre is booked Thursday for the Sports Council event. All acts, please be present by 7:45.", clubSlug: "sarga", club: "Sarga", timeAgo: "5h" },
  { id: "a3", title: "New motion pool uploaded for BP practice", body: "40 fresh motions across social, IR, economics. Sorted by difficulty. See #paradox-drive.", clubSlug: "paradox", club: "Paradox", timeAgo: "1d" },
  { id: "a4", title: "Cook-Off #41 editorial is up", body: "Problem D had a cleaner sqrt-decomp approach — writeup in the channel. Cook-Off #42 unchanged, this Sunday 9 PM.", clubSlug: "codechef", club: "CodeChef", timeAgo: "2d" },
];

export interface Issue {
  id: string;
  title: string;
  category: "Registration" | "Payment" | "Booking" | "Access" | "Other";
  status: "Open" | "In progress" | "Resolved";
  raisedBy: string;
  clubSlug?: string;
  timeAgo: string;
  priority: "Low" | "Med" | "High";
}
export const issues: Issue[] = [
  { id: "i1", title: "Can't RSVP for Fusion Night — button loops", category: "Registration", status: "In progress", raisedBy: "You", timeAgo: "3h", priority: "Med" },
  { id: "i2", title: "Projector in Seminar Hall 3 flickers", category: "Booking", status: "Open", raisedBy: "Aarav Sen", timeAgo: "1d", priority: "High" },
  { id: "i3", title: "Merch payment shows pending after 48 hrs", category: "Payment", status: "Open", raisedBy: "You", timeAgo: "2d", priority: "Med" },
  { id: "i4", title: "Add my membership to CodeChef roster", category: "Access", status: "Resolved", raisedBy: "You", timeAgo: "1w", priority: "Low" },
  { id: "i5", title: "AC broken in Studio B", category: "Booking", status: "Open", raisedBy: "Kalakriti Head", timeAgo: "6h", priority: "High" },
];

export interface Task {
  id: string;
  title: string;
  event: string;
  role: string;
  due: string;
  status: "todo" | "doing" | "done";
  assignee: string;
}
export const tasks: Task[] = [
  { id: "t1", title: "Set up amphitheatre PA system", event: "Fusion Night VI", role: "Tech ops", due: "Sat 5 PM", status: "todo", assignee: "You" },
  { id: "t2", title: "Print speaker badges (60)", event: "BP Open Round", role: "Logistics", due: "Tue 4 PM", status: "doing", assignee: "You" },
  { id: "t3", title: "Confirm mentor slots — Ignite", event: "Ignite 2026", role: "Coordination", due: "Fri", status: "doing", assignee: "You" },
  { id: "t4", title: "Post cook-off writeup on Discord", event: "Cook-Off #41", role: "Content", due: "Done", status: "done", assignee: "You" },
];

export interface Member {
  id: string;
  name: string;
  roll: string;
  role: "Member" | "Volunteer" | "Coordinator" | "Admin";
  clubs: string[];
  joined: string;
  status: "Active" | "Pending" | "Inactive";
  avatar: string; // initial-derived color hue
}
export const members: Member[] = [
  { id: "m1", name: "Ananya Rao", roll: "23s1000123", role: "Admin", clubs: ["CodeChef"], joined: "Aug 2023", status: "Active", avatar: "122" },
  { id: "m2", name: "Kabir Menon", roll: "23s1000456", role: "Coordinator", clubs: ["CodeChef", "E-Cell"], joined: "Aug 2023", status: "Active", avatar: "5" },
  { id: "m3", name: "Ishita Deshpande", roll: "24s1000789", role: "Volunteer", clubs: ["Sarga", "Paradox"], joined: "Jan 2024", status: "Active", avatar: "260" },
  { id: "m4", name: "Rohan Iyer", roll: "24s1000321", role: "Member", clubs: ["CodeChef"], joined: "Feb 2024", status: "Pending", avatar: "85" },
  { id: "m5", name: "Meera Nair", roll: "23s1000654", role: "Coordinator", clubs: ["Kalakriti"], joined: "Aug 2023", status: "Active", avatar: "45" },
  { id: "m6", name: "Aarav Sen", roll: "22s1000111", role: "Member", clubs: ["Arena", "CodeChef"], joined: "Jul 2022", status: "Active", avatar: "155" },
  { id: "m7", name: "Diya Krishnan", roll: "24s1000908", role: "Member", clubs: ["Prakriti"], joined: "May 2024", status: "Pending", avatar: "320" },
  { id: "m8", name: "Vikram Shah", roll: "23s1000202", role: "Member", clubs: ["E-Cell"], joined: "Sep 2023", status: "Inactive", avatar: "0" },
];

export const faqs = [
  { q: "How do I join a club?", a: "Head to Browse Clubs, pick one, hit Join. Some clubs auto-approve; others need admin approval and you'll get a status update." },
  { q: "What if two events I want clash?", a: "Sangam flags conflicts on your dashboard. You can RSVP to both — attendance is checked in separately — but organizers see who's double-booked." },
  { q: "How does event approval work?", a: "Small events go live instantly. Anything requiring venue booking, funds, or off-campus travel routes to the faculty coordinator queue." },
  { q: "Can I be a member of multiple clubs?", a: "Yes. Most students are in 2–3. Your dashboard filters announcements to only clubs you belong to." },
  { q: "Where do bulk imports live?", a: "Admin → Members → Import CSV. Template is downloadable. Duplicate roll numbers are skipped, not overwritten." },
  { q: "I found a bug. What do I do?", a: "Raise an issue from your dashboard. High-priority tickets ping the platform admin directly." },
];

export const resources = [
  { id: "r1", name: "Amphitheatre", type: "Venue", capacity: 300, availability: "Booked Fri 7 PM" },
  { id: "r2", name: "Seminar Hall 3", type: "Venue", capacity: 60, availability: "Free" },
  { id: "r3", name: "Studio B", type: "Venue", capacity: 50, availability: "Booked Wed 8 PM" },
  { id: "r4", name: "Projector — Epson 4K", type: "Equipment", capacity: 1, availability: "Free" },
  { id: "r5", name: "PA System — Yamaha", type: "Equipment", capacity: 1, availability: "Booked Sat" },
  { id: "r6", name: "Common Room", type: "Venue", capacity: 80, availability: "Free" },
];

export const metrics = {
  totalMembers: 1592,
  activeMembers: 1204,
  eventsThisMonth: 27,
  openIssues: 8,
  weeklyAttendance: [140, 210, 180, 260, 320, 290, 380],
  clubGrowth: [
    { club: "CodeChef", growth: 18 },
    { club: "E-Cell", growth: 14 },
    { club: "Sarga", growth: 9 },
    { club: "Kalakriti", growth: 22 },
    { club: "Paradox", growth: 6 },
    { club: "Prakriti", growth: 11 },
  ],
};

export const transparencyLog = [
  { id: "l1", event: "Ignite 2025", outcome: "42 teams, ₹2.4L sponsor pool, 3 pre-seed offers.", date: "Feb 2026", club: "E-Cell", spend: "₹1.8L", attendance: "412 unique" },
  { id: "l2", event: "Fusion Night V", outcome: "Sold-out amphitheatre, ₹18k raised for scholarship fund.", date: "Nov 2025", club: "Sarga", spend: "₹64k", attendance: "300 / 300" },
  { id: "l3", event: "Winter Debate Open", outcome: "12 institutions, IITM BS won ESL semis.", date: "Dec 2025", club: "Paradox", spend: "₹42k", attendance: "180 registered" },
  { id: "l4", event: "Kalakriti Zine Launch", outcome: "First-ever print run of 200 copies. Distributed on campus.", date: "Mar 2026", club: "Kalakriti", spend: "₹28k", attendance: "N/A" },
];
