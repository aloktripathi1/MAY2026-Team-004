<p align="center">
  <img src="public/banner.png" alt="Sangam" width="100%" />
</p>

A community and society management platform. Single source of truth for membership, events, venues, equipment, tasks, and communication, replacing WhatsApp groups, Google Forms, and spreadsheets.

**Live demo:** [try-sangam.vercel.app](https://try-sangam.vercel.app). See [Demo accounts](#demo-accounts) below to sign in.

---

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- **Database**: PostgreSQL via Prisma. Local dev runs against Docker Postgres; production runs on Neon, provisioned through the Vercel Postgres integration. `prisma/schema.prisma` is the active schema; `schema.sqlite.prisma` and `schema.postgres.prisma` are earlier drafts kept for reference only, not wired to anything.
- **Auth**: a custom, signed httpOnly-cookie session (`backend/auth/session-cookies.ts`), not NextAuth. Real signup and login go through `app/api/auth/{signup,login,me}` and `backend/auth/*`. The NextAuth-shaped route at `app/api/auth/[...nextauth]/route.ts` is an unrelated stub kept for URL-shape compatibility; it plays no part in authentication.

---

## Getting started

Requires Docker (for local Postgres) and Node 22.6+.

```bash
git clone <repo-url>
cd sangam
npm install
cp .env.example .env
npm run db:up      # starts Docker Postgres
npm run db:push     # applies the Prisma schema
npm run db:seed     # loads clubs, events, and the demo accounts below
npm run dev
```

The app runs at `http://localhost:3000`.

### Environment variables

Set these in `.env` (see `.env.example` for the full list with defaults):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string. Points at Docker Postgres locally, Neon in production. |
| `AUTH_SECRET` | Signs the session cookie. Required in production; the app refuses to start signing sessions without it. Falls back to a fixed insecure value in development. Generate one with `openssl rand -hex 32`. |
| `ALLOW_DEMO_SESSION` | Optional, development only. Enables the login page's role-preview shortcut, a privileged session with no sign-in required. Never set this in production; protected routes fall back to it only when it's explicitly on. |

---

## Demo accounts

Log in with any of these at [try-sangam.vercel.app/login](https://try-sangam.vercel.app/login) (or locally at `/login`). They're created by `prisma/seed.ts`.

**All-in-one account.** One person, every role at once (Admin on CodeChef, Coordinator on E-Cell, Volunteer on Sarga, Member on Paradox, plus Faculty), so you can switch roles from the sidebar without signing in as five different people:

| Email | Password |
|---|---|
| 23s1000123@ds.study.iitm.ac.in | sangam |

**Single-role accounts** (password `FirstName@2026`), each pinned to exactly one role. Useful for testing that role-gating and cross-club authorization actually hold:

| Name | App role | Email | Password |
|---|---|---|---|
| Alok Kumar Tripathi | Faculty | 23f3003225@ds.study.iitm.ac.in | Alok@2026 |
| Vishal Singh Baraiya | Admin | 23f2005593@ds.study.iitm.ac.in | Vishal@2026 |
| Pardhiv Nukasani | Volunteer | 23f3004115@ds.study.iitm.ac.in | Pardhiv@2026 |
| Purnendu Shukla | Coordinator | 22f2000147@ds.study.iitm.ac.in | Purnendu@2026 |
| Yalla Ashish Chandra Reddy | Member | 23f3003728@ds.study.iitm.ac.in | Ashish@2026 |

Roll numbers match the email's local part (e.g. `23f3003225`). Club roles: CodeChef (Admin), E-Cell (Coordinator), Sarga (Volunteer), Paradox (Member).

---

## Roles and access

Five roles: Admin, Event Coordinator, Club Member, Volunteer, Faculty Mentor. Role is per-club, not global: a `Membership` join table (`User` x `Club`) carries a `ClubRole`, so one person can be Coordinator of one club and a plain Member of another. Faculty is separate, an institution-wide `User.isFaculty` flag rather than a per-club role, since faculty oversight isn't scoped to a single club.

`/admin`, `/coordinator`, `/volunteer`, `/faculty`, and `/app` (member) each check the signed session cookie against the database and redirect to `/login` if you're not signed in as a user who actually holds that role. There's no bypass in production: an anonymous or forged request to any of these routes is turned away, not handed a privileged session.

---

## API docs (OpenAPI / Swagger)

Source of truth: `docs/openapi.yaml` (OpenAPI 3, Swagger-compatible). Served live at `/api/openapi` while the app is running.

| What | URL / path |
|---|---|
| Interactive docs (Try it out) | [http://localhost:3000/api-docs](http://localhost:3000/api-docs) |
| OpenAPI YAML (raw) | [http://localhost:3000/api/openapi](http://localhost:3000/api/openapi) |
| OpenAPI file in repo | `docs/openapi.yaml` |

### Trying an endpoint manually

1. Start the app: `npm run dev`
2. Open [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
3. Expand an operation (e.g. `POST /api/auth/signup`), click **Try it out**, edit the example body, click **Execute**
4. Check **Server response** for the status code and JSON (documented response shapes live in the YAML)

Example signup body (institutional email only, `@ds.study.iitm.ac.in`):

```json
{
  "name": "Ananya Rao",
  "email": "23s1000999@ds.study.iitm.ac.in",
  "rollNumber": "23s1000999",
  "password": "SecurePass1"
}
```

A successful signup returns `201` with `success: true` and sets the session cookie.

### editor.swagger.io vs. local `/api-docs`

You can paste or load `docs/openapi.yaml` into [editor.swagger.io](https://editor.swagger.io/) to view or edit the spec.

**Don't rely on Execute there against `http://localhost:3000`.** The editor is served over HTTPS, so the browser blocks calls to plain HTTP localhost (mixed content) and Swagger shows something like "Undocumented, Failed to fetch." That's a browser limitation, not a broken API. CORS is enabled for `https://editor.swagger.io` on `/api/*`, but for reliable Try it out, use the local docs at [http://localhost:3000/api-docs](http://localhost:3000/api-docs) instead, since it shares an origin with the API.

---

## Testing

### Unit tests (Node)

```bash
npm test
```

If your Node build doesn't support native TypeScript stripping (`ERR_NO_TYPESCRIPT`), run it with `npx tsx tests/run-tests.ts` instead.

### Integration tests (pytest, live HTTP)

Hits real Next.js route handlers over HTTP (`tests/pytest/`). The app and database both need to be running.

```bash
npm run test:pytest:install

# Terminal 1: app + database
npm run db:up
npm run db:push
npm run db:seed
npm run dev

# Terminal 2: tests
python3 -m pytest -s
```

Optional env var: `SANGAM_BASE_URL` (defaults to `http://localhost:3000`).

Written test-case docs, in the course-required format, live under `docs/test-cases/`.

### Quick smoke check without Swagger

With `npm run dev` running:

```bash
curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Ananya Rao","email":"23s1000999@ds.study.iitm.ac.in","rollNumber":"23s1000999","password":"SecurePass1"}'
```

---

## Project structure

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
  (faculty)/faculty/          oversight dashboard, event approvals, club activity
  api/auth/[...nextauth]/     unrelated stub, see Tech stack above
  api/openapi/                serves docs/openapi.yaml
  (public)/api-docs/          local Swagger UI (Try it out)

docs/
  openapi.yaml            Swagger-compatible OpenAPI 3 spec
  design.md                design notes
  testing-report.md        QA / testing writeup
  test-cases/              per-endpoint test case docs, course-required format

components/
  ui/          Btn, GlassCard, Stat, StatusPill, Modal, shared design-system primitives
  shell/       AppShell (per-role sidebar/nav), PageHeader
  auth/        AuthShell (shared login/signup visual shell), OnboardingForm
  tasks/       TaskStatusButtons, shared between the volunteer and coordinator task boards
  (route-local components, e.g. forms and list views specific to one page, live colocated
   next to their page.tsx inside app/, per Next.js convention, rather than under components/)

backend/                  server-only code, never imported by client components
  auth/
    mock-session.ts        the demo/role-preview session, see Environment variables above
    session-cookies.ts     signs and verifies the real session cookie
    authenticate-user.ts, create-user.ts, get-current-user.ts   auth domain logic shared
                            by both the REST routes (app/api/auth/*) and the form actions
    login-schema.ts, signup-schema.ts    zod schemas shared by both entry points
    roles.ts                helpers for reading a user's per-club role from the session
  api/
    http.ts                 jsonSuccess/jsonError response shape shared by REST routes
  db/
    prisma.ts                Prisma Client singleton
  domain/
    workflow-rules.ts        status enums and authorization rules (requireClubAdminAccess,
                              isEventPast, etc.)
    approvals.ts, countMeIn.ts, tasks.ts, events.ts, membership.ts   Server Actions and
                              domain logic shared across more than one route

lib/                      frontend-facing helpers, safe to import from client components
  seed-data.ts             static content not modeled as a DB table (landing-page copy, etc.)
  notification-prefs.ts    parse/default helpers for the profile's notification toggles
  interests.ts             parse/default helpers for signup interests and club recommendations
  event-tags.ts            parse/serialize helpers for comma-separated event tags
  format.ts                date/display formatting helpers
  utils.ts                 cn() class-name helper

prisma/
  schema.prisma            active schema (schema.postgres.prisma / .sqlite.prisma: reference only)
  migrations/, seed.ts
```

---

## Data model

Role is per-club, not global, as described in [Roles and access](#roles-and-access). Venues and Equipment are separate models, not a merged "Resource" type. The shape is shared exactly by `prisma/schema.prisma` and the live Postgres database via `backend/db/prisma.ts`.

---

## Deployment

Production runs on Vercel, built from `main`. The database is Neon Postgres, connected through the Vercel Postgres integration, which manages `DATABASE_URL` automatically. `AUTH_SECRET` is set directly in the Vercel project's environment variables. `ALLOW_DEMO_SESSION` is intentionally left unset in production, so the role-preview shortcut never activates there.

To point production at a fresh database: `npx prisma db push --schema=prisma/schema.prisma` against the new `DATABASE_URL`, then `npx tsx prisma/seed.ts` to load clubs, events, and the demo accounts.

---

## Known gaps vs. original plan

- Volunteer has a task list and an events view, but no dedicated FAQ view yet (member and volunteer roles have no FAQ page; FAQ content only exists on the public landing page).
- Venue and Equipment booking isn't implemented as a feature. The `Venue`/`Equipment` models and seed data exist, but no page or Server Action reads or writes them. `Event.venue` is a plain free-text field, unrelated to the `Venue` model.
- Image uploads (issue attachments, profile avatars) may still use data URLs in places; prefer real file storage before production scale.
- No CI pipeline yet (no `.github/workflows`): typecheck, lint, and both test suites currently run locally, not automatically on every PR.

---

## Team, Dhurandhar (MAY2026-Team-004)

| Name | Project role |
|---|---|
| Alok Kumar Tripathi | Team Lead, Backend |
| Vishal Singh Baraiya | Product Manager |
| Pardhiv Nukasani | Frontend |
| Purnendu Shukla | Backend, Code Review |
| Yalla Ashish Chandra Reddy | Testing |

## License

Academic project. IITM BS Software Engineering, May 2026 term.
