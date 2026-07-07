# Sangam

A community and society management platform. Single source of truth for membership, events, venues, equipment, tasks, and communication, replacing WhatsApp groups, Google Forms, and spreadsheets.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL (prod) / SQLite (local dev) — two schema files, see below
- NextAuth.js (Credentials provider, JWT sessions)

## Getting Started

```bash
git clone <repo-url>
cd sangam
bun install
cp .env.example .env
bun run db:migrate   # applies prisma/schema.sqlite.prisma, generates the client
bun run db:seed      # seeds demo clubs/users/events — all seeded users share password "password123"
bun run dev
```

App runs at `http://localhost:3000`.

`npm` works too if you don't have `bun` (`npm install`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`) — just note there's no committed lockfile for either yet, so the first person to run `bun install` should commit the resulting `bun.lock`.

## Database

Two Prisma schemas, kept manually in sync:

- `prisma/schema.sqlite.prisma` — local dev. Enums are downgraded to plain validated `String` fields (SQLite has no enum type), and `Event.tags` is a comma-joined string (SQLite has no array type).
- `prisma/schema.postgres.prisma` — production. Real Postgres enums and native `String[]` arrays.

Scripts always target the SQLite schema by default (`bun run dev`, `bun run db:migrate`, `bun run db:studio`); use `bun run db:migrate:prod` / `next build` (which runs `prisma generate --schema=prisma/schema.postgres.prisma`) for the Postgres path.

## Project Structure

```
app/
  (public)/        landing, clubs directory, login, signup
  (member)/app/    dashboard, clubs, events (+ RSVP), issues (+ raise), faq, profile
  (admin)/admin/   dashboard, members, approvals, announcements, metrics, transparency, handover
  (coordinator)/coordinator/  dashboard, new event, resources (venues + equipment), volunteers
  (volunteer)/volunteer/      task list with inline status updates
  (faculty)/faculty/          oversight dashboard, event approvals
  api/auth/[...nextauth]/     NextAuth route handler

components/
  ui/          Btn, GlassCard, Stat, StatusPill — shared design-system primitives
  shell/       AppShell (per-role sidebar/nav), PageHeader
  auth/        AuthShell (shared login/signup visual shell)
  tasks/       TaskStatusButtons — shared between the volunteer and coordinator task boards
  (route-local components — e.g. forms, list views specific to one page — live colocated
   next to their page.tsx inside app/, per Next.js convention, rather than under components/)

lib/
  auth.ts               NextAuth config (authOptions)
  prisma.ts              Prisma client singleton
  session-helpers.ts     helpers for reading a user's per-club role from the session
  actions/               Server Actions shared across more than one route (approvals, task status)
  seed-data.ts            seed dataset for prisma/seed.ts; also backs the two bits of content that
                           are deliberately static rather than DB-backed (FAQ copy, landing preview)
  format.ts               date/display formatting helpers
  utils.ts                cn() class-name helper

types/
  next-auth.d.ts    session/JWT type augmentation (adds id, isFaculty, memberships to Session.user)

prisma/
  schema.postgres.prisma, schema.sqlite.prisma, migrations/, seed.ts
```

## Data model

Role is per-club, not global: a `Membership` join table (`User` × `Club`) carries a `ClubRole` (`Member | Volunteer | Coordinator | Admin`), so one user can be Coordinator of one club and a plain Member of another. Faculty is separate — an institution-wide `User.isFaculty` flag, not part of the per-club role system, since faculty oversight isn't scoped to a single club.

Venues and Equipment are separate models (not a merged "Resource" type).

## Roles

Admin, Event Coordinator, Club Member, Volunteer, Faculty Mentor. Route access is gated two ways: `middleware.ts` checks for a signed-in session on every `/app`, `/admin`, `/coordinator`, `/volunteer`, `/faculty` request; each persona's `layout.tsx` then checks the session's actual `Membership` role (or `isFaculty`) and redirects to `/app` if it doesn't match.

## Seeded dev accounts

`bun run db:seed` creates these accounts (source: `lib/seed-data.ts` → `prisma/seed.ts`). Every account uses the same password: **`password123`**. Email is `<roll>@ds.study.iitm.ac.in`.

| Name | Roll no. | Email | Role(s) · Club(s) | Membership status |
|---|---|---|---|---|
| Ananya Rao | 23f1000123 | 23f1000123@ds.study.iitm.ac.in | Admin · CodeChef | Active |
| Kabir Menon | 23f1000456 | 23f1000456@ds.study.iitm.ac.in | Coordinator · CodeChef, E-Cell | Active |
| Ishita Deshpande | 24f1000789 | 24f1000789@ds.study.iitm.ac.in | Volunteer · Sarga, Paradox | Active |
| Rohan Iyer | 24f1000321 | 24f1000321@ds.study.iitm.ac.in | Member · CodeChef | **Pending** (good for testing the admin approvals queue) |
| Meera Nair | 23f1000654 | 23f1000654@ds.study.iitm.ac.in | Coordinator · Kalakriti | Active |
| Aarav Sen | 22f1000111 | 22f1000111@ds.study.iitm.ac.in | Member · Arena, CodeChef | Active |
| Diya Krishnan | 24f1000908 | 24f1000908@ds.study.iitm.ac.in | Member · Prakriti | **Pending** |
| Vikram Shah | 23f1000202 | 23f1000202@ds.study.iitm.ac.in | Member · E-Cell | Inactive |
| — (Faculty, no roll number) | — | faculty.mentor@ds.study.iitm.ac.in | Faculty (`isFaculty: true`, institution-wide, not club-scoped) | — |

Quick picks for testing each persona: **Ananya Rao** for `/admin` (CodeChef Admin), **Kabir Menon** for `/coordinator` (Coordinator of two clubs), **Ishita Deshpande** for `/volunteer`, any of the above for `/app` (member views), **the Faculty account** for `/faculty`.

Seeded content alongside the users: 8 clubs, 8 events (mixed upcoming/past, one pending faculty approval — "Ignite 2026"), 4 announcements, 5 issues, 4 tasks, 4 venues + 2 equipment items, 4 transparency-log entries. Re-running `bun run db:seed` on top of an already-seeded DB will hit unique-constraint errors (slugs/emails collide) — wipe `prisma/dev.db` first (`rm prisma/dev.db && bun run db:migrate` recreates it, then reseed).

## Known gaps vs. original plan

- Volunteer currently only has the task list — no dedicated events or FAQ view yet.
- Admin doesn't have a standalone "issues" view — club issues currently only surface in the member persona (raised-by-me list) and aren't yet aggregated for admins.
- No automated tests yet (Vitest setup planned).

## Team — Dhurandhar (MAY2026-Team-004)

| Name | Role |
|---|---|
| Alok Kumar Tripathi | Team Lead, Backend |
| Vishal Singh Baraiya | Product Manager |
| Pardhiv Nukasani | Frontend |
| Purnendu Shukla | Backend, Code Review |
| Yalla Ashish Chandra Reddy | Testing |

## License

Academic project — IITM BS Software Engineering, May 2026 term.
