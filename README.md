<p align="center">
  <img src="public/banner.png" alt="Sangam" width="100%" />
</p>

A community and society management platform. Single source of truth for membership, events, venues, equipment, tasks, and communication, replacing WhatsApp groups, Google Forms, and spreadsheets.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- **Data layer**: `lib/prisma.ts` — a hand-written in-memory store shaped like Prisma Client's query API (`findMany`, `create`, `update`, relation embedding, etc.), seeded from `lib/seed-data.ts`. No real database is connected in this build.
- **Auth**: a lightweight custom httpOnly-cookie session (`lib/auth-session.ts` + `lib/mock-session.ts`), not NextAuth — `app/api/auth/[...nextauth]/route.ts` is a stub that returns `{ mode: "mock" }`; real auth is intentionally disabled for this milestone.
- `prisma/schema.postgres.prisma` / `schema.sqlite.prisma` describe the target data model for a future real-database migration. They're kept accurate and in sync, but nothing in the running app is actually wired to a live Postgres or SQLite database yet.

## Getting Started

```bash
git clone <repo-url>
cd sangam
npm install
npm run dev
```

App runs at `http://localhost:3000`. No database setup or seed step is needed — `lib/seed-data.ts` is the live dataset, loaded into an in-memory store on server start. Data resets to the seed state on every dev-server restart; nothing persists to disk.

The `db:migrate` / `db:migrate:prod` / `db:studio` scripts in `package.json` exist for the eventual real-database migration described in the Prisma schema files — they operate on those schema files but have no corresponding live database in this build, so there's nothing to run day-to-day.

## Accessing each persona

There's no real login flow yet. The fastest way in is to just visit a persona's route directly — `/admin`, `/coordinator`, `/volunteer`, `/faculty`, or `/app` (member) — each is served by a single built-in demo session (`lib/mock-session.ts`) that holds every persona's role at once, so no sign-in step is required. The login/signup pages exist and have real-looking form validation, but since there's no live database backing user records with usable password hashes, the "Try a role" buttons on the login page are the intended way to switch personas, not typing credentials.

Each persona displays as a distinct, real seeded person even though they all share one underlying demo account:

| Persona | Displayed as |
|---|---|
| Admin (`/admin`) | Ananya Rao — CodeChef IITM BS |
| Coordinator (`/coordinator`) | Kabir Menon — E-Cell IITM BS |
| Volunteer (`/volunteer`) | Ishita Deshpande — Sarga |
| Member (`/app`) | Ananya Rao |
| Faculty (`/faculty`) | Prof. R. Krishnan |

Route-level gating still exists as real code — `middleware.ts` and each persona's `layout.tsx` check the session for the right role and redirect to `/app` otherwise — but since the demo session always holds every role simultaneously, none of those redirects actually trigger in this build.

## Project Structure

```
app/
  (public)/        landing, clubs directory, login, signup (+ interests onboarding)
  (member)/app/    dashboard, clubs (+ join requests), events (+ Count Me In), issues
                    (raise via modal + screenshot attachments, status filter), profile
                    (edit details + avatar upload, notification preference toggles)
  (admin)/admin/   overview, members (+ add member, bulk CSV import), issues
                    (filterable queue, per-row/bulk assignment), approvals, announcements
                    (+ audience targeting), metrics, transparency, handover
  (coordinator)/coordinator/  dashboard (+ New Event popup), all-events history, event
                    dashboard (registration, check-in, edit details), volunteers
  (volunteer)/volunteer/      task list with inline status updates, events (Count Me In)
  (faculty)/faculty/          oversight dashboard, event approvals, club activity (engagement signals)
  api/auth/[...nextauth]/     stub route — real auth is intentionally disabled for this build

components/
  ui/          Btn, GlassCard, Stat, StatusPill, Modal — shared design-system primitives
  shell/       AppShell (per-role sidebar/nav), PageHeader
  auth/        AuthShell (shared login/signup visual shell), OnboardingForm
  tasks/       TaskStatusButtons — shared between the volunteer and coordinator task boards
  (route-local components — e.g. forms, list views specific to one page — live colocated
   next to their page.tsx inside app/, per Next.js convention, rather than under components/)

lib/
  mock-session.ts        the demo session — one account holding every persona's role at once,
                          displayed under a distinct persona name per role (see table above)
  auth-session.ts         httpOnly cookie helpers backing that session (not NextAuth)
  prisma.ts               in-memory data layer shaped like Prisma Client's query API
  session-helpers.ts      helpers for reading a user's per-club role from the session
  actions/                Server Actions shared across more than one route (approvals, task status)
  seed-data.ts             the actual dataset — clubs, events, members, issues, announcements, etc.
  notification-prefs.ts    parse/default helpers for the profile's notification toggles
  interests.ts             parse/default helpers for signup interests + club recommendations
  format.ts                date/display formatting helpers
  utils.ts                 cn() class-name helper

prisma/
  schema.postgres.prisma, schema.sqlite.prisma, migrations/
  (target schema for a future real-database migration — not wired to a live DB yet)
```

## Data model

Role is per-club, not global: a `Membership` join table (`User` × `Club`) carries a `ClubRole` (`Member | Volunteer | Coordinator | Admin`), so one user can be Coordinator of one club and a plain Member of another. Faculty is separate — an institution-wide `User.isFaculty` flag, not part of the per-club role system, since faculty oversight isn't scoped to a single club.

Venues and Equipment are separate models (not a merged "Resource" type).

This shape is mirrored exactly by both the Prisma schema files (the target for a real database) and the in-memory mock in `lib/prisma.ts` (what actually runs today).

## Roles

Admin, Event Coordinator, Club Member, Volunteer, Faculty Mentor. See "Accessing each persona" above for how to reach each one in this build.

## Seed data

`lib/seed-data.ts` is the single source of truth for everything the app displays: 8 clubs, 10 events (mixed upcoming/past, 3 currently pending faculty approval), 4 announcements, 5 issues, 4 tasks, 8 members, 6 venue/equipment rows (see "Known gaps" below), and 4 transparency-log entries. Edit it directly and restart the dev server to see changes — there's no seed script to run separately since it's loaded straight into the in-memory store.

## Known gaps vs. original plan

- Volunteer has a task list and an events view — no dedicated FAQ view yet (member and volunteer roles have no FAQ page; FAQ content only exists on the public landing page).
- Venue and Equipment booking is not implemented as a feature — the `Venue`/`Equipment` models and seed data exist, but no page or Server Action anywhere reads or writes them. `Event.venue` is a plain free-text field, unrelated to the `Venue` model.
- No real database, auth, or file storage — see the Tech Stack section. Image uploads (issue attachments, profile avatars) are stored as base64 data URLs in the in-memory store, not real file storage, which won't scale past the demo.
- Automated tests are available for core business logic and workflow rules via `npm test`.

## Team — Dhurandhar (MAY2026-Team-004)

| Name | Role |
|---|---|
| Alok Kumar Tripathi | Team Lead, Backend |
| Vishal Singh Baraiya | Product Manager |
| Pardhiv Nukasani | Frontend |
| Purnendu Shukla | Backend, Code Review |
| Yalla Ashish Chandra Reddy | Testing |

## License

