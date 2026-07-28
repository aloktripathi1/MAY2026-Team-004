<p align="center">
  <img src="public/banner.png" alt="Sangam" width="100%" />
</p>

A community and society management platform. Single source of truth for membership, events, venues, equipment, tasks, and communication, replacing WhatsApp groups, Google Forms, and spreadsheets.

---

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- **Data layer**: `backend/db/prisma.ts` — the real Prisma Client, backed by Docker Postgres. Static/decorative content that isn't modeled as a DB table lives in `lib/seed-data.ts`.
- **Auth**: a custom httpOnly-cookie session (`backend/auth/session-cookies.ts` + `backend/auth/mock-session.ts`), not NextAuth — `app/api/auth/[...nextauth]/route.ts` is a stub that returns `{ mode: "mock" }` for the demo-persona path; real signup/login goes through `app/api/auth/{signup,login,me}` and `backend/auth/*`.
- `prisma/schema.postgres.prisma` / `schema.sqlite.prisma` describe the target data model for a future real-database migration. They're kept accurate and in sync, but nothing in the running app is actually wired to a live Postgres or SQLite database yet.

---

## Getting Started

```bash
git clone <repo-url>
cd sangam
npm install
npm run dev
```

App runs at `http://localhost:3000`. No database setup or seed step is needed — `lib/seed-data.ts` is the live dataset, loaded into an in-memory store on server start. Data resets to the seed state on every dev-server restart; nothing persists to disk.

The `db:migrate` / `db:migrate:prod` / `db:studio` scripts in `package.json` exist for the eventual real-database migration described in the Prisma schema files — they operate on those schema files but have no corresponding live database in this build, so there's nothing to run day-to-day.

---

## API docs (OpenAPI / Swagger)

Source of truth: `docs/openapi.yaml` (Swagger-compatible OpenAPI 3). Served live at `/api/openapi` while the app is running.

| What | URL / path |
|---|---|
| Interactive docs (Try it out) | [http://localhost:3000/api-docs](http://localhost:3000/api-docs) |
| OpenAPI YAML (raw) | [http://localhost:3000/api/openapi](http://localhost:3000/api/openapi) |
| OpenAPI file in repo | `docs/openapi.yaml` |

### How to try an endpoint (manual)

1. Start the app: `npm run dev`
2. Open [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
3. Expand an operation (e.g. `POST /api/auth/signup`) → **Try it out** → edit the example body → **Execute**
4. Check **Server response** for status code and JSON (documented responses live in the YAML)

Example signup body (institutional email only — `@ds.study.iitm.ac.in`):

```json
{
  "name": "Ananya Rao",
  "email": "23s1000999@ds.study.iitm.ac.in",
  "rollNumber": "23s1000999",
  "password": "SecurePass1"
}
```

Expect `201` with `success: true` and session cookies set on success.

### editor.swagger.io vs local `/api-docs`

You can paste or load `docs/openapi.yaml` into [editor.swagger.io](https://editor.swagger.io/) to **view/edit** the spec.

**Do not rely on Execute there against `http://localhost:3000`.** The editor is HTTPS; the browser blocks calls to HTTP localhost (mixed content). Swagger then shows something like **Undocumented — Failed to fetch** (CORS / network). That is a browser limitation, not a broken API.

- CORS is enabled for `https://editor.swagger.io` on `/api/*` when the browser allows the request.
- For reliable **Try it out**, always use [http://localhost:3000/api-docs](http://localhost:3000/api-docs) (same origin as the API).

---

## Testing

### Automated (Node)

Schema / unit-style checks (no server required for most cases):

```bash
npm test
```

### Automated (pytest — live HTTP)

Course-style pytest hits real Next.js Route Handlers over HTTP (`tests/pytest/`). App + DB must be running.

```bash
npm run test:pytest:install

# Terminal 1 — DB + app
npm run db:up
npm run db:push
npm run db:seed   # optional; needed for seeded login accounts
npm run dev

# Terminal 2 — tests
npm run test:pytest
```

Optional: `SANGAM_BASE_URL` (default `http://localhost:3000`).

Written test cases (expected format): `docs/test-cases/` (e.g. `docs/test-cases/auth-signup.md`).

---

### Quick smoke check without Swagger

With `npm run dev` running:

```bash
curl.exe -s -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d "{\"name\":\"Ananya Rao\",\"email\":\"23s1000999@ds.study.iitm.ac.in\",\"rollNumber\":\"23s1000999\",\"password\":\"SecurePass1\"}"
```

---

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

---

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
  api/openapi/                serves docs/openapi.yaml
  (public)/api-docs/          local Swagger UI (Try it out)

docs/
  openapi.yaml                Swagger-compatible OpenAPI 3
  test-cases/                 manual/API test case writeups
  user_stories.md             user stories
  Sangam_M3_M4_Plan.md        sprint plan

components/
  ui/          Btn, GlassCard, Stat, StatusPill, Modal — shared design-system primitives
  shell/       AppShell (per-role sidebar/nav), PageHeader
  auth/        AuthShell (shared login/signup visual shell), OnboardingForm
  tasks/       TaskStatusButtons — shared between the volunteer and coordinator task boards
  (route-local components — e.g. forms, list views specific to one page — live colocated
   next to their page.tsx inside app/, per Next.js convention, rather than under components/)

backend/                  server-only code — never imported by client components
  auth/
    mock-session.ts        the demo session — one account holding every persona's role at once,
                            displayed under a distinct persona name per role (see table above)
    session-cookies.ts     httpOnly cookie helpers backing the real session (not NextAuth)
    authenticate-user.ts, create-user.ts, get-current-user.ts   auth domain logic used by
                            both the REST routes (app/api/auth/*) and the form Server Actions
    login-schema.ts, signup-schema.ts    zod schemas shared by both entry points
    roles.ts                helpers for reading a user's per-club role from the session
  api/
    http.ts                 jsonSuccess/jsonError response shape shared by REST routes
  db/
    prisma.ts                Prisma Client singleton
  domain/
    workflow-rules.ts        status enums + authorization rules (requireClubAdminAccess, etc.)
    approvals.ts, countMeIn.ts, tasks.ts   Server Actions shared across more than one route

lib/                      frontend-facing helpers (safe to import from client components)
  seed-data.ts             the actual dataset — clubs, events, members, issues, announcements, etc.
  notification-prefs.ts    parse/default helpers for the profile's notification toggles
  interests.ts             parse/default helpers for signup interests + club recommendations
  event-tags.ts            parse/serialize helpers for comma-separated event tags
  format.ts                date/display formatting helpers
  utils.ts                 cn() class-name helper

prisma/
  schema.prisma            active schema, backed by Docker Postgres (schema.postgres.prisma / .sqlite.prisma kept for reference)
  migrations/, seed.ts
```

---

## Data model

Role is per-club, not global: a `Membership` join table (`User` × `Club`) carries a `ClubRole` (`Member | Volunteer | Coordinator | Admin`), so one user can be Coordinator of one club and a plain Member of another. Faculty is separate — an institution-wide `User.isFaculty` flag, not part of the per-club role system, since faculty oversight isn't scoped to a single club.

Venues and Equipment are separate models (not a merged "Resource" type).

This shape is mirrored exactly by both the Prisma schema files and the live Postgres database (via `backend/db/prisma.ts`).

---

## Roles

Admin, Event Coordinator, Club Member, Volunteer, Faculty Mentor. See "Accessing each persona" above for how to reach each one in this build.

---

## Seed data

Run against Docker Postgres:

```bash
npm run db:up
npm run db:push
npm run db:seed
```

`lib/seed-data.ts` plus `prisma/seed.ts` load clubs, events, and demo content. Team role accounts (for login testing) are seeded from the roster below.

---

## Team — Dhurandhar (MAY2026-Team-004)

| Name | Project role |
|---|---|
| Alok Kumar Tripathi | Team Lead, Backend |
| Vishal Singh Baraiya | Product Manager |
| Pardhiv Nukasani | Frontend |
| Purnendu Shukla | Backend, Code Review |
| Yalla Ashish Chandra Reddy | Testing |

---

### App role test accounts (password = `FirstName@2026`)

| Name | App role | Email | Password |
|---|---|---|---|
| Alok Kumar Tripathi | Faculty | 23f3003225@ds.study.iitm.ac.in | Alok@2026 |
| Vishal Singh Baraiya | Admin | 23f2005593@ds.study.iitm.ac.in | Vishal@2026 |
| Pardhiv Nukasani | Volunteer | 23f3004115@ds.study.iitm.ac.in | Pardhiv@2026 |
| Purnendu Shukla | Coordinator | 22f2000147@ds.study.iitm.ac.in | Purnendu@2026 |
| Yalla Ashish Chandra Reddy | Member | 23f3003728@ds.study.iitm.ac.in | Ashish@2026 |

Roll numbers match the email local part (e.g. `23f3003225`). Club roles are attached to CodeChef (Admin), E-Cell (Coordinator), Sarga (Volunteer), and Paradox (Member).

---

## Known gaps vs. original plan

- Volunteer has a task list and an events view — no dedicated FAQ view yet (member and volunteer roles have no FAQ page; FAQ content only exists on the public landing page).
- Venue and Equipment booking is not implemented as a feature — the `Venue`/`Equipment` models and seed data exist, but no page or Server Action anywhere reads or writes them. `Event.venue` is a plain free-text field, unrelated to the `Venue` model.
- Image uploads (issue attachments, profile avatars) may still use data URLs in places; prefer real file storage before production scale.
- Automated tests: `npm test` (Node) and `npm run test:pytest` (live HTTP; see **Testing** above).

## License

