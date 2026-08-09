<p align="center">
  <img src="public/banner.png" alt="Sangam" width="100%" />
</p>

Sangam is a community and society management platform: one place for membership, events, venues, equipment, tasks, and communication, built to replace the WhatsApp groups, Google Forms, and spreadsheets clubs typically patch together.

**Live demo:** [sangam-club.com](https://sangam-club.com). See [Demo accounts](#demo-accounts) to sign in.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Team](#team-dhurandhar-may2026-team-004)
- [Getting started](#getting-started)
- [Demo accounts](#demo-accounts)
- [Roles and provisioning](#roles-and-provisioning)
- [API docs](#api-docs-openapi--swagger)
- [Testing](#testing)
- [Email notifications](#email-notifications)
- [Ask Sangam](#ask-sangam)
- [Data model](#data-model)
- [Deployment](#deployment)
- [License](#license)

---

## Features

- **Role-based dashboards**: separate views for Admin, Coordinator, Volunteer, Member, and Faculty, each showing only what that role needs to act on. Admin also carries full Coordinator authority in its own club, so a club's Admin can create its first event and assign its first task without appointing a Coordinator first.
- **Membership management**: join requests, bulk CSV member import, per-club roles instead of one global permission level.
- **Events lifecycle**: creation, faculty approval, registration ("Count Me In") with race-safe capacity enforcement, check-in, and registration locking.
- **Issue tracking**: members raise issues with screenshot attachments; admins triage, filter, and assign them individually or in bulk.
- **Announcements**: audience-targeted broadcasts instead of blanket messages.
- **Email notifications**: transactional and activity email through [Resend](https://resend.com/), covering signup verification, membership and approval decisions, registration confirmations, schedule changes, task assignments, and daily reminder/digest sweeps, with per-category opt-outs and one-click unsubscribe. See [Email notifications](#email-notifications).
- **Transparency & metrics**: admin-facing club health and activity reporting.
- **Ask Sangam**: an in-app assistant for grounded Q&A and agentic writes (task status, assign/bulk, announcements). Capabilities follow the shell you're in and nothing mutates until you Accept. See [Ask Sangam](#ask-sangam).
- **Signed session auth**: custom httpOnly-cookie sessions with server-side role checks on every protected route, no client-trusted state.

---

## Tech stack

**Frontend**
- [Next.js 14](https://nextjs.org/) (App Router)
- [React 18](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Motion](https://motion.dev/) for animation
- [Lucide](https://lucide.dev/) for icons

**Backend & data**
- [Prisma](https://www.prisma.io/) as ORM
- [PostgreSQL](https://www.postgresql.org/), hosted on [Neon](https://neon.tech/) (serverless Postgres), provisioned through the Vercel Postgres integration
- [Zod](https://zod.dev/) for schema validation
- [bcrypt](https://www.npmjs.com/package/bcrypt) for password hashing
- [Vercel Blob](https://vercel.com/storage/blob) for file storage

**Auth**
- A custom, signed httpOnly-cookie session (`backend/auth/session-cookies.ts`). Real signup and login go through `app/api/auth/{signup,login,me}` and `backend/auth/*`.
- [Google OAuth](https://developers.google.com/identity) as an additional sign-in method alongside email/password.

**AI**
- [Anthropic SDK](https://www.anthropic.com/api) (`@anthropic-ai/sdk`) powers Ask Sangam: classification, grounded Q&A, and the agentic write capability. A custom tool-calling loop (propose a tool call, run it, feed back the result, repeat) is built directly on the SDK's native tool-use API (`backend/assistant/agent/`, `lib/genai.ts`).
- [Groq](https://groq.com/) Whisper (`whisper-large-v3-turbo`) for voice input, transcribing a recorded clip to text before it reaches the same assistant pipeline (`lib/groq.ts`). Plain `fetch` against Groq's API, no SDK dependency.

**Testing**
- [Jest](https://jestjs.io/) with [Testing Library](https://testing-library.com/) for unit, component, and live-HTTP integration suites (see [Testing](#testing))

**Deployment**
- [Vercel](https://vercel.com/), built from `main` (see [Deployment](#deployment))

---

## Team Dhurandhar (MAY2026-Team-004)

| Name | Project role |
|---|---|
| Alok Kumar Tripathi | Team Lead, Backend, Frontend |
| Vishal Singh Baraiya | Product Manager |
| Pardhiv Nukasani | Frontend |
| Purnendu Shukla | Backend, Code Review |
| Yalla Ashish Chandra Reddy | Testing |

---

## Getting started

Requires Node 22.6+ and Docker.

```bash
git clone <repo-url>
cd sangam
npm install
cp .env.example .env
npm run db:up      # Postgres
npm run db:push    # applies the Prisma schema
npm run db:seed    # loads clubs, events, and the demo accounts below
npm run dev
```

The app runs at `http://localhost:3000`.

### Environment variables

Set these in `.env` (see `.env.example` for the full list with defaults):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string, local or Neon. |
| `AUTH_SECRET` | Signs the session cookie. Required in production; the app refuses to start signing sessions without it. Falls back to a fixed insecure value in development. Generate one with `openssl rand -hex 32`. |
| `ASSISTANT_ACTION_SECRET` | HMAC for Ask Sangam Server Action request envelopes (`backend/assistant/security/request-signing.ts`). Required for query/confirm actions. |
| `ANTHROPIC_API_KEY` | Powers Ask Sangam via `lib/genai.ts`. Get a key at [console.anthropic.com](https://console.anthropic.com/). |
| `GROQ_API_KEY` | Powers Ask Sangam's voice input via `lib/groq.ts`. Get a key at [console.groq.com](https://console.groq.com/). |
| `RESEND_API_KEY` | Powers email notifications via `backend/email/`. Get a key at [resend.com/api-keys](https://resend.com/api-keys). |
| `EMAIL_ENABLED` | Master switch for real delivery. Unset or `false` puts the mailer in dry-run. Real sends need this **and** `RESEND_API_KEY`. |
| `EMAIL_FROM` | Sender identity: `Sangam <no-reply@sangam-club.com>` once the domain is verified. Defaults to Resend's `onboarding@resend.dev` test sender. |
| `EMAIL_REPLY_TO` | Optional `Reply-To`. Omit to let replies bounce. |
| `EMAIL_ALLOWLIST` | Comma-separated addresses or domains that may receive real mail. Anything else is skipped and logged. Empty means no restriction. |
| `APP_URL` | Absolute origin used to build links inside emails. Falls back to the host of the request being served, so a stale value can't produce dead links in mail sent during a request, but set it: scheduled mail has no request to borrow a host from. |
| `CRON_SECRET` | Bearer token for the scheduled-email routes under `/api/cron/email/*`. Without it those routes refuse every request. |
| `REQUIRE_EMAIL_VERIFICATION` | Refuses sign-in until the address is confirmed. **On by default**, and only active once email can actually be delivered. Set `false` to disable. See [Requiring verified email](#requiring-verified-email). |

---

## Demo accounts

Log in with any of these at [sangam-club.com/login](https://sangam-club.com/login) (or locally at `/login`). They're created by `prisma/seed.ts`, each pinned to exactly one role (password `FirstName@2026`):

| Name | App role | Email | Password |
|---|---|---|---|
| Alok Kumar Tripathi | Faculty | 23f3003225@ds.study.iitm.ac.in | Alok@2026 |
| Vishal Singh Baraiya | Admin | 23f2005593@ds.study.iitm.ac.in | Vishal@2026 |
| Pardhiv Nukasani | Volunteer | 23f3004115@ds.study.iitm.ac.in | Pardhiv@2026 |
| Purnendu Shukla | Coordinator | 22f2000147@ds.study.iitm.ac.in | Purnendu@2026 |
| Yalla Ashish Chandra Reddy | Member | 23f3003728@ds.study.iitm.ac.in | Ashish@2026 |

Roll numbers match the email's local part (e.g. `23f3003225`). Club roles: CodeChef (Admin), E-Cell (Coordinator), Sarga (Volunteer), Paradox (Member).

---

## Roles and provisioning

Five roles: Admin, Event Coordinator, Club Member, Volunteer, Faculty Mentor. Roles are **per-club** (`Membership.role`) except Faculty, which is institution-wide (`User.isFaculty`), so one person can be Coordinator of one club and a plain Member of another.

**Admin also acts as Coordinator in its own club.** A club has exactly one Admin, so it can never hold a separate Coordinator membership too, but the platform treats Admin as outranking Coordinator everywhere a Coordinator action is checked: creating events, managing the task board, and the same capabilities through Ask Sangam. This means a freshly-approved club's sole Admin can host its first event and assign its first task immediately, without appointing anyone else first.

Signup produces a plain account with no club; every elevated role is granted by someone:

| Role | Granted by |
|---|---|
| Member / Volunteer / Coordinator of a club | that club's **Admin**, from `/admin/members`: set when adding someone, or changed later from the role control on each row |
| **Club Admin** | faculty approving the club proposal (first admin), or the outgoing admin via `/admin/handover` |
| **Faculty** | another faculty member at `/faculty/club-requests`, or `scripts/bootstrap-faculty.ts` for the first one |

### The first faculty account

Faculty approve events for every club and appoint other faculty, so it's deliberately **not reachable from the web**. The first one is granted from the command line, which requires database access:

```bash
npx tsx scripts/bootstrap-faculty.ts you@ds.study.iitm.ac.in
```

The account must already exist, so sign up in the app first. `--list` shows who currently has faculty. Against production, pull that database's URL first:

```bash
npx vercel env pull .env.production.local --environment=production
```

```bash
DATABASE_URL="$(grep '^DATABASE_URL=' .env.production.local | cut -d= -f2- | tr -d '"')" npx tsx scripts/bootstrap-faculty.ts you@ds.study.iitm.ac.in
```

After that, faculty appoint each other in the app. Revoking is guarded: you can't remove your own access, and you can't remove the last faculty account.

### Changing someone's role

An Admin changes a member's role from the dropdown on their row in `/admin/members`, or over REST with `PATCH /api/clubs/{id}/members/{memberId}` (accepts `role`, `status`, or both). The member is emailed, unless they're still `Pending`.

**Admin is not assignable this way.** A club has exactly one Admin, and `/admin/handover` owns that move because it demotes the outgoing Admin in the same transaction.

### New clubs

Students propose clubs from **My clubs → Propose a club**; faculty review them at **/faculty/club-requests**. Approving creates the `Club` **and** the proposer's Admin membership in one transaction.

The slug is generated from the name (suffixed if taken); the hue and banner gradient come from a hash of the name. A proposal is refused if the club already exists, if an identical one is already pending, or if the student already has three open. Both decisions email the proposer, and rejections can carry a short reason.

### Route protection

`/admin`, `/coordinator`, `/volunteer`, `/faculty`, and `/app` (member) each check the signed session cookie against the database and redirect to `/login` if you're not signed in as a user who actually holds that role.

---

## API docs (OpenAPI / Swagger)

Source of truth: `docs/openapi.yaml` (OpenAPI 3, Swagger-compatible), served live at `/api/openapi` while the app is running.

| What | URL / path |
|---|---|
| Interactive docs (Try it out) | [http://localhost:3000/api/docs](http://localhost:3000/api/docs) |
| OpenAPI YAML (raw) | [http://localhost:3000/api/openapi](http://localhost:3000/api/openapi) |
| OpenAPI file in repo | `docs/openapi.yaml` |
| Live | [sangam-club.com/api/docs](https://www.sangam-club.com/api/docs) · [sangam-club.com/api/openapi](https://www.sangam-club.com/api/openapi) |

### Trying an endpoint manually

1. Start the app: `npm run dev`
2. Open [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
3. Expand an operation (e.g. `POST /api/auth/signup`), click **Try it out**, edit the example body, click **Execute**
4. Check **Server response** for the status code and JSON (documented response shapes live in the YAML)

Example signup body (institutional email only, `@ds.study.iitm.ac.in`). Roll number isn't submitted; it's derived server-side from the email's local part:

```json
{
  "name": "Ananya Rao",
  "email": "23s1000999@ds.study.iitm.ac.in",
  "password": "SecurePass1"
}
```

A successful signup returns `201` with `success: true` and sets the session cookie.

### editor.swagger.io vs. local `/api/docs`

You can paste or load `docs/openapi.yaml` into [editor.swagger.io](https://editor.swagger.io/) to view or edit the spec.

**Don't rely on Execute there against `http://localhost:3000`.** The editor is served over HTTPS, so the browser blocks calls to plain HTTP localhost (mixed content). CORS is enabled for `https://editor.swagger.io` on `/api/*`, but for reliable Try it out, use the local docs at [http://localhost:3000/api/docs](http://localhost:3000/api/docs) instead, since it shares an origin with the API.

---

## Testing

Everything runs on Jest. Three suites, split because they need different things to run:

### Unit tests

Pure logic in `lib/` and `backend/*` (formatters, auth-role helpers, workflow rules like `isEventPast`, Zod schemas). No server or database needed.

```bash
npm test
```

### Component tests

React components under `tests/components/`, run with `jsdom` via Testing Library. No server or database needed.

```bash
npm run test:components
```

### Integration tests (live HTTP)

Hits real Next.js route handlers over HTTP (`tests/integration/`), covering every REST endpoint under `app/api/`. The app and database both need to be running.

```bash
# Terminal 1: app + database
npm run db:up
npm run db:push
npm run db:seed
npm run dev

# Terminal 2: tests
npm run test:integration
```

Optional env var: `SANGAM_BASE_URL` (defaults to `http://localhost:3000`).

Role-scoped endpoints (coordinator, admin, faculty) authenticate as the matching seeded team account from [Demo accounts](#demo-accounts), so the suite exercises the same session and authorization path a real user would hit. It also covers the concurrency fix behind event registration (ten simultaneous requests for one capacity slot, asserting exactly one winner) and security paths: anonymous access to protected routes, a forged session cookie, cross-role authorization, and 404s for missing dynamic pages.

Email is covered in both suites. `tests/unit/backend/email/` renders every template and checks token, config, and audience logic; `tests/integration/email.test.ts` drives the real send path against the database in dry-run: idempotency, preference opt-outs, transactional mail ignoring opt-outs, the sweeps, verification single-use, unsubscribe GET-vs-POST, and cron auth. Nothing is delivered, see [Dry-run is the default](#dry-run-is-the-default).

### Ask Sangam write tests (live Claude + DB)

Confirmable writes: bulk/single assign, task status, role-audience and targeted announcements, and wrong-shell refusals. Hits real Claude (`ANTHROPIC_API_KEY`) and Postgres; fixtures are cleaned up afterward. Needs a seeded database (`npm run db:push && npm run db:seed`); the Next.js app does not need to be running for these files.

```bash
npm run test:integration -- --testPathPatterns="assistant-tools|assistant-write"
```

### Quick smoke check without Swagger

With `npm run dev` running:

```bash
curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Ananya Rao","email":"23s1000999@ds.study.iitm.ac.in","password":"SecurePass1"}'
```

---

## Email notifications

All outbound email lives in [`backend/email/`](backend/email). Domain code never talks to the provider directly: it calls a named function like `notifyMembershipApplied(userId, clubId)`, and that layer decides who hears about it, renders the template, and hands one `sendEmail()` call the result. Notifications are **best-effort by design**: a membership approval still stands if the mail provider is down.

### Provider

[Resend](https://resend.com/), chosen because the app is a Vercel-hosted Next.js project: one SDK, no IAM or sandbox-exit process, DKIM handled from the dashboard.

### Dry-run is the default

Sending needs **both** `EMAIL_ENABLED=true` and `RESEND_API_KEY`. With either missing, every send is decided, logged to the console, and recorded in `EmailLog` with status `dryRun`, but nothing leaves the app. The seeded accounts are real IITM addresses, so local development and the test suite deliberately never deliver.

`EMAIL_ALLOWLIST` is the second guard: while no domain is verified, it restricts real delivery to listed addresses or domains. It applies to real sends only; dry-run still shows what would have gone out.

To check a real send once `RESEND_API_KEY` is in place:

```bash
npx tsx scripts/send-test-email.ts you@example.com registrationConfirmation
```

### What triggers what

| Email | Trigger | Category |
|---|---|---|
| Signup verification | account created (`createUserAccount`) | *transactional, no opt-out* |
| Password reset | user requests one via `/forgot-password` | *transactional, no opt-out* |
| Membership request received | member applies to a club | `membership` |
| Membership request awaiting approval | member applies → club admins | `membership` |
| Membership approved / rejected | admin decides on the request | `membership` |
| Welcome | first membership anywhere goes Active | `membership` |
| Role changed | admin adds a member above `Member` | `membership` |
| Admin handover (both sides) | `transferAdminAction` | `membership` |
| New club event | coordinator or admin creates an event | `events` |
| Event awaiting approval | event created → faculty | `events` |
| Event approved / not approved | faculty or admin decides | `events` |
| Registration confirmed | member counts themselves in | `events` |
| **Schedule change** | date, time or venue moved → registrants | `events` |
| Event cancelled | approved event with registrants is rejected | `events` |
| Task assigned | coordinator or admin assigns a volunteer task | `tasks` |
| New announcement | **High** priority only, posted | `announcements` |
| Issue received | member raises an issue | `issues` |
| Issue status changed / resolved | admin moves the status | `issues` |

Schedule-change mail only goes out when a registrant would actually rearrange their day: `diffScheduleFields` compares date, time, and venue, so a reworded description mails nobody.

### Scheduled email

Five daily sweeps, wired in [`vercel.json`](vercel.json) and served by `/api/cron/email/{sweep}`:

| Sweep | What it does |
|---|---|
| `event-reminders` | "Your event is tomorrow", to everyone registered |
| `task-due-reminders` | Open tasks due tomorrow |
| `task-overdue` | Daily nudge for slipped tasks, giving up after 14 days |
| `registration-closing-soon` | Members not yet registered for a nearly-full or imminent event |
| `announcement-digest` | One email covering the day's Low/Med announcements per person |

Dedupe keys name the **target** (`eventReminder:<eventId>:<userId>`), never the run, so a retry can't double-send. Windows are calendar days, so a sweep that fires late still covers the same rows.

The routes authenticate with `Authorization: Bearer $CRON_SECRET`; Vercel sends this automatically. Without `CRON_SECRET` set they refuse every request. Run one by hand with:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/email/event-reminders"
```

Add `?at=2026-09-17T09:00:00Z` to drive the windows without waiting for the clock.

### Requiring verified email

A new account is **not** signed in until its address is confirmed. Set `REQUIRE_EMAIL_VERIFICATION=false` to turn that off. When active:

- signup no longer returns a session; it redirects to `/signup/check-email`
- clicking the emailed link (`GET /api/auth/verify-email`) confirms the address **and** signs the user in
- `POST /api/auth/login` answers **403 `EMAIL_UNVERIFIED`** until confirmed, distinct from `INVALID_CREDENTIALS` since the password was actually right
- the login form offers "Send me a new verification link", backed by `POST /api/auth/resend-verification`

The gate is **inert unless email can actually be delivered**: if `EMAIL_ENABLED` is off or no API key is set, it doesn't fire. That means it never interferes locally or in tests, and starts applying in production the moment email works.

`EMAIL_ALLOWLIST` does **not** filter verification mail; that would turn the safety net into a lockout.

Enabling the gate never strands an existing login. The gate distinguishes old accounts from new by whether a verification token was ever issued for that account: signup always issues one, so "no token, ever" identifies accounts that predate the feature, and those are let through and stamped on first sign-in.

### Preferences and unsubscribe

`User.notificationPrefs` has five email flags (`emailAnnouncements`, `emailEvents`, `emailTasks`, `emailMembership`, `emailIssues`), toggled from **Profile → Notification preferences**, default on.

Every non-transactional email carries a signed opt-out link and the `List-Unsubscribe` / `List-Unsubscribe-Post` headers Gmail and Yahoo expect. `GET /api/email/unsubscribe` shows a confirmation; `POST` performs it, deliberately split because mail clients pre-fetch links.

### Idempotency and audit

Every attempt writes an `EmailLog` row. `dedupeKey` is unique and doubles as the idempotency lock: a repeated key returns `duplicate` and mails nothing. On a genuine send failure the key is released so a retry can try again, and the failed row survives for audit.

### Going live on a real domain

The sending domain is **sangam-club.com** (registrar and DNS: Hostinger). Until it's verified, `EMAIL_FROM` uses Resend's `onboarding@resend.dev`, which only delivers to the address that owns the Resend account.

1. **Add the domain in Resend.** [resend.com/domains](https://resend.com/domains) → **Add Domain** → `sangam-club.com`. Pick the region closest to your users; it decides the MX hostname and can't be changed afterward.
2. **Add the records in Hostinger.** hPanel → **Domains** → sangam-club.com → **DNS / Nameservers** → *DNS Records*. Resend gives three: a `TXT` DKIM key at `resend._domainkey`, a `TXT` SPF record at `send`, and an `MX` record at `send`.

   > **Hostinger gotcha:** its editor appends the domain automatically. Enter `resend._domainkey` and `send`, not the full `resend._domainkey.sangam-club.com`, or it verifies against the wrong name.
3. **Wait for verification**, or force it with **Verify DNS Records**. Check from a terminal:
   ```bash
   dig +short TXT resend._domainkey.sangam-club.com && dig +short TXT send.sangam-club.com && dig +short MX send.sangam-club.com
   ```
4. **Optional, recommended: DMARC.** Once SPF and DKIM verify, add a `TXT` record named `_dmarc`, value `v=DMARC1; p=none; rua=mailto:you@sangam-club.com`.
5. **Flip the app over** in the Vercel project's environment variables:

   | Variable | Value |
   |---|---|
   | `RESEND_API_KEY` | a fresh key from [resend.com/api-keys](https://resend.com/api-keys) |
   | `EMAIL_FROM` | `Sangam <no-reply@sangam-club.com>` |
   | `APP_URL` | `https://sangam-club.com`, must match the origin the app is actually served from |
   | `EMAIL_ALLOWLIST` | keep it pinned to your own address for a first live round |
   | `EMAIL_ENABLED` | `true` |
   | `CRON_SECRET` | `openssl rand -hex 32`, or the sweeps stay dark |

6. **Prove it, then open up.** With the allowlist still pinned, trigger one real flow and confirm delivery. Only then clear `EMAIL_ALLOWLIST` to let mail reach actual members.

```bash
npx tsx scripts/send-test-email.ts you@sangam-club.com registrationConfirmation
```

---

## Ask Sangam

A drawer that answers from your club data and can propose writes. Writes never hit the database until you **Accept** on the proposal card; **Reject** cancels cleanly. Multi-write asks (joined with "also") can show several cards at once, plus **Accept all** / **Reject all**.

Built on the [Anthropic SDK](https://www.anthropic.com/api) with a custom classify → tool-call → propose → confirm loop (see [Tech stack](#tech-stack)). Voice input transcribes through [Groq Whisper](https://groq.com/) before reaching the same pipeline.

What you can *do* depends on the **dashboard shell** you're in, not on phrases like "as admin" in the chat: the write agent trusts the real session role, never the user's own wording. Switch roles in the sidebar for a different toolkit.

### Who can do what

| Shell | Can ask / read | Can propose (Accept required) | Cannot do here |
|---|---|---|---|
| **Member** (`/app`) | Next events, announcements, own club memberships | none | Tasks, assign, bulk, roster, post announcements |
| **Volunteer** (`/volunteer`) | Same as Member, plus **own** open tasks | Mark **your** tasks `todo` / `doing` / `done` | Assign / bulk, club roster load, post announcements |
| **Coordinator** (`/coordinator`) | Events & announcements in scope, club volunteer roster, task load by status | Board task status, single assign, bulk assign, multi-ask (also) with N confirm cards | Post announcements (Admin only) |
| **Admin** (`/admin`) | Everything Coordinator can, plus announcements + club context | Everything Coordinator can propose, plus draft/post announcements (role audience or named people, timing picker) | Nothing a Coordinator or Admin could do through the UI |
| **Faculty** (`/faculty`) | Approvals, upcoming events, announcements | none | Writes (tasks, assign, announcements) |

Wrong-shell asks get a short refusal (e.g. bulk assign as Volunteer, announcement as Coordinator, roster as Volunteer).

### Try one from each write shell

**Volunteer** (`/volunteer`)

```text
Mark "Setup PA System" as doing
```

**Coordinator** (`/coordinator`) or **Admin** (`/admin`)

```text
List active volunteers
Assign booth setup to Pardhiv Nukasani for Test Event 1
Mark "Independence Day Function Approval" as doing, also assign check-in to Pardhiv Nukasani for Test Event 1
```

**Admin** (`/admin`)

```text
Draft an announcement titled "Team sync" saying sync is Friday at 5pm for all members
```

On announcements you'll pick **who** (All / Volunteers / Coordinators, or a named person) and **when** (Send now vs. digest), then Accept.

### How an agentic mode works

1. You ask, or tap an example chip.
2. One or more proposal cards appear. Accept is disabled until any required pickers are chosen.
3. Accept runs the domain write and refreshes boards/lists. Reject burns the pending tokens. With several cards, confirm each one or use **Accept all** / **Reject all**.

Ambiguous **tasks** (two "Booth setup" rows) use an on-card picker, not a chat follow-up. Ambiguous **people** for assign clarify in chat before a proposal.

Assign and announcement Accepts can email through the normal mailer. That only leaves the app when `EMAIL_ENABLED=true` and `RESEND_API_KEY` are set; otherwise you'll see `[email:dry-run]` in the server log.

### Under the hood (short)

UI → Server Actions (`askSangamQueryAction` / `askSangamConfirmAction`) → classifier → write agent + tool registry → signed pending token(s) → Accept → domain + `revalidatePath`. Legacy `/api/assistant/*` returns **410**.

---

## Data model

Role is per-club, not global, as described in [Roles and provisioning](#roles-and-provisioning). Venues and Equipment are separate models, not a merged "Resource" type. The shape is shared exactly by `prisma/schema.prisma` and the live Postgres database via `backend/db/prisma.ts`.

`EmailLog` and `EmailVerificationToken` support [Email notifications](#email-notifications). `EmailLog.dedupeKey` is unique and doubles as the idempotency lock for the cron sweeps. Only the SHA-256 hash of each verification token is stored, so a database leak can't be replayed as a valid link. `User.emailVerified` records the fact of verification; it's deliberately not a login gate, since that would lock out every account created before this feature.

---

## Deployment

Production runs on Vercel, built from `main`. The database is Neon Postgres, connected through the Vercel Postgres integration, which manages `DATABASE_URL` automatically. `AUTH_SECRET` is set directly in the Vercel project's environment variables. Sessions require a signed cookie from login/signup; there's no anonymous demo persona.

To point production at a fresh database: `npx prisma db push --schema=prisma/schema.prisma` against the new `DATABASE_URL`, then `npx tsx prisma/seed.ts` to load clubs, events, and the demo accounts.

**Email.** `EMAIL_ENABLED` is left unset until a sender domain is verified, so production runs in dry-run and sends nothing. `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, and `CRON_SECRET` go in the same Vercel environment variables as `AUTH_SECRET`; the daily sweeps in `vercel.json` are inert without `CRON_SECRET`. Full steps in [Going live on a real domain](#going-live-on-a-real-domain).

---

## License

This project is licensed under the [MIT License](LICENSE).
