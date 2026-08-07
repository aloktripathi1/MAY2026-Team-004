<p align="center">
  <img src="public/banner.png" alt="Sangam" width="100%" />
</p>

Sangam is a community and society management platform: a single source of truth for membership, events, venues, equipment, tasks, and communication, built to replace the WhatsApp groups, Google Forms, and spreadsheets clubs typically end up patching together.

**Live demo:** [sangam-club.com](https://sangam-club.com). See [Demo accounts](#demo-accounts) to sign in.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Team](#team-dhurandhar-may2026-team-004)
- [Getting started](#getting-started)
- [Demo accounts](#demo-accounts)
- [Roles and provisioning](#roles-and-provisioning)
- [Roles and access](#roles-and-access)
- [API docs](#api-docs-openapi--swagger)
- [Testing](#testing)
- [Email notifications](#email-notifications)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [Deployment](#deployment)
- [License](#license)

---

## Features

- **Role-based dashboards**: separate, purpose-built views for Admin, Coordinator, Volunteer, Member, and Faculty, each showing only what that role needs to act on.
- **Membership management**: join requests, bulk CSV member import, per-club roles instead of one global permission level.
- **Events lifecycle**: creation, faculty approval, registration ("Count Me In") with race-safe capacity enforcement, check-in, and registration locking.
- **Issue tracking**: members raise issues with screenshot attachments; admins triage, filter, and assign them individually or in bulk.
- **Announcements**: audience-targeted broadcasts instead of blanket messages.
- **Email notifications**: transactional and activity email through [Resend](https://resend.com/) — signup verification, membership and approval decisions, registration confirmations, schedule changes, task assignments, and daily reminder/digest sweeps — with per-category opt-outs and one-click unsubscribe. See [Email notifications](#email-notifications).
- **Transparency & metrics**: admin-facing club health and activity reporting.
- **Ask Sangam**: an in-app assistant (`POST /api/assistant/query`) for natural-language questions about club data.
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
- A custom, signed httpOnly-cookie session (`backend/auth/session-cookies.ts`), not NextAuth. Real signup and login go through `app/api/auth/{signup,login,me}` and `backend/auth/*`. The NextAuth-shaped route at `app/api/auth/[...nextauth]/route.ts` is an unrelated stub kept for URL-shape compatibility; it plays no part in authentication.

**AI**
- [Anthropic Claude API](https://www.anthropic.com/api) powers Ask Sangam, the in-app assistant

**Testing**
- [Jest](https://jestjs.io/) with [Testing Library](https://testing-library.com/) for unit, component, and live-HTTP integration suites (see [Testing](#testing))

**Deployment**
- [Vercel](https://vercel.com/), built from `main` (see [Deployment](#deployment))

---

## Team, Dhurandhar (MAY2026-Team-004)

| Name | Project role |
|---|---|
| Alok Kumar Tripathi | Team Lead, Backend |
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
| `ALLOW_DEMO_SESSION` | Optional, development only. Enables the login page's role-preview shortcut, a privileged session with no sign-in required. Never set this in production; protected routes fall back to it only when it's explicitly on. |
| `ANTHROPIC_API_KEY` | Powers Ask Sangam (`POST /api/assistant/query`) via `lib/genai.ts`. Get a key at [console.anthropic.com](https://console.anthropic.com/). |
| `RESEND_API_KEY` | Powers email notifications via `backend/email/`. Get a key at [resend.com/api-keys](https://resend.com/api-keys). |
| `EMAIL_ENABLED` | Master switch for real delivery. Unset or `false` puts the mailer in dry-run. Real sends need this **and** `RESEND_API_KEY`. |
| `EMAIL_FROM` | Sender identity — `Sangam <no-reply@sangam-club.com>` once the domain is verified. Defaults to Resend's `onboarding@resend.dev` test sender. |
| `EMAIL_REPLY_TO` | Optional `Reply-To`. Omit to let replies bounce. |
| `EMAIL_ALLOWLIST` | Comma-separated addresses or domains that may receive real mail. Anything else is skipped and logged. Empty means no restriction. |
| `APP_URL` | Absolute origin used to build links inside emails. Falls back to the host of the request being served, so a stale value can't produce dead links in mail sent during a request — but set it, because scheduled mail has no request to borrow a host from. |
| `CRON_SECRET` | Bearer token for the scheduled-email routes under `/api/cron/email/*`. Without it those routes refuse every request. |
| `REQUIRE_EMAIL_VERIFICATION` | Refuses sign-in until the address is confirmed. **On by default**, and only active once email can actually be delivered. Set `false` to disable — see [Requiring verified email](#requiring-verified-email). |

---

## Demo accounts

Log in with any of these at [sangam-club.com/login](https://sangam-club.com/login) (or locally at `/login`). They're created by `prisma/seed.ts`.

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

## Roles and provisioning

Roles are **per-club** (`Membership.role`) except faculty, which is
institution-wide (`User.isFaculty`). Signup produces a plain account with no
club, so every elevated role has to be granted by someone:

| Role | Granted by |
|---|---|
| Member / Volunteer / Coordinator of a club | that club's **Admin**, from `/admin/members` — set when adding someone, or changed later from the role control on each row |
| **Club Admin** | faculty approving the club proposal (first admin), or the outgoing admin via `/admin/handover` |
| **Faculty** | another faculty member at `/faculty/club-requests`, or `scripts/bootstrap-faculty.ts` for the first one |

### The first faculty account

Faculty approve events for every club and appoint other faculty, so it is
deliberately **not reachable from the web** — no signup option, nothing to trick.
The first one is granted from the command line, which requires database access:

```bash
npx tsx scripts/bootstrap-faculty.ts you@ds.study.iitm.ac.in
```

The account must already exist, so sign up in the app first. `--list` shows who
currently has faculty. Against production, pull that database's URL first:

```bash
npx vercel env pull .env.production.local --environment=production
```

```bash
DATABASE_URL="$(grep '^DATABASE_URL=' .env.production.local | cut -d= -f2- | tr -d '"')" npx tsx scripts/bootstrap-faculty.ts you@ds.study.iitm.ac.in
```

After that, faculty appoint each other in the app. Revoking is guarded: you
can't remove your own access, and you can't remove the last faculty account —
either would leave the institution with no reviewer and no way to appoint one
short of another bootstrap run.

### Changing someone's role

An Admin changes a member's role from the dropdown on their row in
`/admin/members`, or over REST with `PATCH /api/clubs/{id}/members/{memberId}`
(which now accepts `role`, `status`, or both). The member is emailed, unless
they're still `Pending` — telling someone their role changed before they've been
told they're in reads as nonsense.

**Admin is not assignable this way.** A club has exactly one Admin, and
`/admin/handover` owns that move because it demotes the outgoing Admin in the
same transaction; allowing it here would let a club end up with two Admins or
none.

### New clubs

Students propose clubs from **My clubs → Propose a club**; faculty review them at
**/faculty/club-requests**. Approving creates the `Club` **and** the proposer's
Admin membership in one transaction — a club with no admin is precisely the dead
end this flow exists to remove, and would be unfixable through the UI.

The proposer's presentation fields are derived rather than asked for: the slug is
generated from the name (suffixed if taken), and the hue and banner gradient come
from a hash of the name, matching the seeded clubs. A proposal is refused if the
club already exists, if an identical one is already pending, or if the student
already has three open. Both decisions email the proposer, and rejections can
carry a short reason.

Before this existed, `Club` rows and the first Admin of a club could only come
from `prisma/seed.ts`, and `isFaculty` was never written outside it — so a freshly
deployed database had clubs nobody could administer and no way to appoint anyone.

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

Leave `ALLOW_DEMO_SESSION` unset when running this suite — it asserts that anonymous requests are
refused rather than handed the privileged demo persona, so switching the shortcut on fails those
cases by design.

Role-scoped endpoints (coordinator, admin, faculty) authenticate as the matching seeded team account from [Demo accounts](#demo-accounts) rather than relying on the `ALLOW_DEMO_SESSION` shortcut, so the suite exercises the same session and authorization path a real user would hit. It also covers the concurrency fix behind event registration (ten genuinely simultaneous requests for one capacity slot, asserting exactly one winner) and the security-relevant paths: anonymous access to every protected route and API, a forged session cookie, cross-role authorization, and 404s for missing dynamic pages.

Email is covered in both suites. `tests/unit/backend/email/` renders every template (escaping,
plain-text twin, category) and checks the token, config and audience logic; `tests/integration/email.test.ts`
drives the real send path against the database in dry-run — idempotency, preference opt-outs,
transactional mail ignoring opt-outs, the sweeps, verification single-use, unsubscribe
GET-vs-POST, and cron auth. Nothing is delivered: see [Dry-run is the default](#dry-run-is-the-default).

Written test-case docs, in the course-required format, live under `docs/test-cases/`.

### Quick smoke check without Swagger

With `npm run dev` running:

```bash
curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Ananya Rao","email":"23s1000999@ds.study.iitm.ac.in","rollNumber":"23s1000999","password":"SecurePass1"}'
```

---

## Email notifications

All outbound email lives in [`backend/email/`](backend/email). Domain code never talks to the
provider: it calls a named function like `notifyMembershipApplied(userId, clubId)`, and that
layer decides who hears about it, renders the template, and hands one `sendEmail()` call the
result. Notifications are **best-effort by design** — a membership approval still stands if the
mail provider is down.

### Provider

[Resend](https://resend.com/), chosen over SES and Postmark because the app is a Vercel-hosted
Next.js project: one SDK, no IAM or sandbox-exit process, and DKIM handled from the dashboard.
Vercel and Neon cannot send mail themselves, so an external provider was required either way.

### Dry-run is the default

Sending needs **both** `EMAIL_ENABLED=true` and `RESEND_API_KEY`. With either missing every send
is decided, logged to the console and recorded in `EmailLog` with status `dryRun` — but nothing
leaves the app. The seeded accounts are real IITM addresses, so local development and the test
suite deliberately never deliver.

`EMAIL_ALLOWLIST` is the second guard: while no domain is verified, it restricts real delivery to
listed addresses or domains. It applies to real sends only — dry-run still shows what *would*
have gone out.

To check a real send once `RESEND_API_KEY` is in place:

```bash
npx tsx scripts/send-test-email.ts you@example.com registrationConfirmation
```

It prints the resolved sender, mode and result, and delivers nothing while `EMAIL_ENABLED` is off.

### What triggers what

| Email | Trigger | Category |
|---|---|---|
| Signup verification | account created (`createUserAccount`) | *transactional — no opt-out* |
| Membership request received | member applies to a club | `membership` |
| Membership request awaiting approval | member applies → club admins | `membership` |
| Membership approved / rejected | admin decides on the request | `membership` |
| Welcome | first membership anywhere goes Active | `membership` |
| Role changed | admin adds a member above `Member` | `membership` |
| Admin handover (both sides) | `transferAdminAction` | `membership` |
| New club event | coordinator creates an event | `events` |
| Event awaiting approval | event created → faculty | `events` |
| Event approved / not approved | faculty or admin decides | `events` |
| Registration confirmed | member counts themselves in | `events` |
| **Schedule change** | date, time or venue moved → registrants | `events` |
| Event cancelled | approved event with registrants is rejected | `events` |
| Task assigned | coordinator assigns a volunteer task | `tasks` |
| New announcement | **High** priority only, posted | `announcements` |
| Issue received | member raises an issue | `issues` |
| Issue status changed / resolved | admin moves the status | `issues` |

Schedule-change mail only goes out when a registrant would actually rearrange their day —
`diffScheduleFields` compares date, time and venue, so a reworded description mails nobody.

### Scheduled email

Five daily sweeps, wired in [`vercel.json`](vercel.json) and served by
`/api/cron/email/{sweep}`:

| Sweep | What it does |
|---|---|
| `event-reminders` | "Your event is tomorrow", to everyone registered |
| `task-due-reminders` | Open tasks due tomorrow |
| `task-overdue` | Daily nudge for slipped tasks, giving up after 14 days |
| `registration-closing-soon` | Members not yet registered for a nearly-full or imminent event |
| `announcement-digest` | One email covering the day's Low/Med announcements per person |

Two properties make them safe to run repeatedly, which matters because Vercel Cron retries:
dedupe keys name the **target** (`eventReminder:<eventId>:<userId>`), never the run; and windows
are calendar days, so a sweep that fires late still covers the same rows.

The routes authenticate with `Authorization: Bearer $CRON_SECRET` — Vercel sends this
automatically. **Without `CRON_SECRET` set they refuse every request**, since an open URL here
would let anyone mail a club's members. Run one by hand with:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/email/event-reminders"
```

Add `?at=2026-09-17T09:00:00Z` to drive the windows without waiting for the clock.

### Requiring verified email

A new account is **not** signed in until its address is confirmed. Set
`REQUIRE_EMAIL_VERIFICATION=false` to turn that off. When active:

- signup no longer returns a session; it redirects to `/login?verify=sent`
- `POST /api/auth/login` answers **403 `EMAIL_UNVERIFIED`** until confirmed
  (deliberately distinct from `INVALID_CREDENTIALS` — the password *was* right,
  and a generic message would send people to reset a password that works)
- the login form offers "Send me a new verification link", backed by
  `POST /api/auth/resend-verification`

The gate is **inert unless email can actually be delivered** — if `EMAIL_ENABLED`
is off or no API key is set, it does not fire. Requiring a step nobody can
complete would refuse every account, including whoever is trying to configure it.
That also means it never interferes locally or in tests, and starts applying in
production the moment email works.

`EMAIL_ALLOWLIST` does **not** filter verification mail. The allowlist exists to
keep *notification* fan-out off real inboxes during rollout; verification goes to
one address the recipient just typed and is the only way into their own account,
so filtering it would turn the safety net into a lockout.

Enabling the gate never strands an existing login. `prisma/seed.ts` stamps the
seeded demo accounts, migration `20260806160000_backfill_email_verified` settles
old rows for anyone deploying with `prisma migrate deploy` — **and the gate does
not depend on either**.

That last part matters because production deploys with `prisma db push`
(`vercel.json`), which syncs schema structure and never executes migration SQL,
so the backfill does not run there. Instead the gate distinguishes the two
meanings of a null `emailVerified` by asking whether a verification token was
ever issued for that account: signup always issues one before the account can
sign in, so "no token, ever" identifies exactly the accounts that predate the
feature. Those are let through and stamped on first sign-in, so it resolves once
per account rather than on every attempt.

It fails open in one rare case by design — if issuing the token itself failed,
the account is admitted. Locking someone out because our own mail system broke
is the worse of the two outcomes.

The resend endpoint answers identically for known and unknown addresses so it
can't be used to enumerate accounts.

### Preferences and unsubscribe

`User.notificationPrefs` gained five email flags (`emailAnnouncements`, `emailEvents`,
`emailTasks`, `emailMembership`, `emailIssues`) alongside the three existing in-app feed flags,
which never expressed "don't mail me". They're toggled from **Profile → Notification
preferences**, default on, and rows written before this change read as opted in.

Every non-transactional email carries a signed opt-out link and the `List-Unsubscribe` /
`List-Unsubscribe-Post` headers Gmail and Yahoo expect. `GET /api/email/unsubscribe` shows a
confirmation; `POST` performs it — deliberately split, because mail clients pre-fetch links and a
GET that unsubscribed would opt people out of mail they still want.

`pinnedAnnouncementsOnly` is honoured too: someone with it on only gets announcement email for
pinned posts.

### Idempotency and audit

Every attempt writes an `EmailLog` row. `dedupeKey` is unique, so the claim doubles as the
idempotency lock — a repeated key returns `duplicate` and mails nothing. On a genuine send
failure the key is released (mangled to `failed:<id>:<key>`) so a retry can try again while the
failed row survives for audit. `sendEmail` also passes the dedupe key to Resend as an
`Idempotency-Key`, so an abandoned-but-succeeding request can't become a second delivery.

### Going live on a real domain

The sending domain is **sangam-club.com** (registrar and DNS: Hostinger). Until it's verified,
`EMAIL_FROM` uses Resend's `onboarding@resend.dev`, which **only delivers to the address that owns
the Resend account** — enough to prove the flows, not enough for real recipients.

**1. Add the domain in Resend.** [resend.com/domains](https://resend.com/domains) → **Add Domain**
→ `sangam-club.com`. Pick the region closest to your users; it decides the MX hostname in the next
step and can't be changed afterwards. Resend then shows the exact records to create.

**2. Add the records in Hostinger.** hPanel → **Domains** → sangam-club.com → **DNS / Nameservers**
→ *DNS Records*. Expect three from Resend, roughly:

| Type | Name | Value |
|---|---|---|
| `TXT` | `resend._domainkey` | the DKIM public key (`p=…`), a long single string |
| `TXT` | `send` | `v=spf1 include:amazonses.com ~all` |
| `MX` | `send` | `feedback-smtp.<region>.amazonses.com`, priority `10` |

Copy the values from the dashboard rather than the table above — the DKIM key and the region in the
MX host are generated per domain.

SPF and MX land on the `send.` subdomain even though mail is *from* the root domain: that's the
Return-Path Resend uses for bounce handling, and it does not stop `no-reply@sangam-club.com`
working as the visible sender.

> **Hostinger gotcha:** its editor appends the domain automatically. Enter `resend._domainkey` and
> `send`, **not** `resend._domainkey.sangam-club.com` — the latter becomes
> `resend._domainkey.sangam-club.com.sangam-club.com` and never verifies. Leave TTL at the default.

**3. Wait for verification.** Hostinger usually propagates in minutes; Resend rechecks on its own,
and **Verify DNS Records** forces it. All records must read *Verified*. Check from a terminal with:

```bash
dig +short TXT resend._domainkey.sangam-club.com && dig +short TXT send.sangam-club.com && dig +short MX send.sangam-club.com
```

**4. Optional but recommended — DMARC.** Once SPF and DKIM verify, add one more `TXT` record,
name `_dmarc`, value `v=DMARC1; p=none; rua=mailto:you@sangam-club.com`. Start at `p=none` so
nothing is rejected while you watch the reports.

**5. Flip the app over.** In the Vercel project's environment variables:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | a fresh key from [resend.com/api-keys](https://resend.com/api-keys) |
| `EMAIL_FROM` | `Sangam <no-reply@sangam-club.com>` |
| `APP_URL` | `https://sangam-club.com` — must match the origin the app is actually served from, or every link in every email is dead |
| `EMAIL_ALLOWLIST` | keep it pinned to your own address for a first live round |
| `EMAIL_ENABLED` | `true` |
| `CRON_SECRET` | `openssl rand -hex 32`, or the sweeps stay dark |

**6. Prove it, then open up.** With the allowlist still pinned, trigger one real flow and confirm
delivery. Only then clear `EMAIL_ALLOWLIST` to let mail reach actual members — that variable is the
single thing standing between a bug and 45 students' inboxes.

```bash
npx tsx scripts/send-test-email.ts you@sangam-club.com registrationConfirmation
```

### Not yet wired

Two items from the issue's email list have no trigger in the app yet, and the gap is a missing
*feature*, not a missing email:

- **"New reply on your issue"** — `Issue` has no comment or reply model, so there is nothing to
  notify about. `notifyIssueReply` and its template are written and tested, ready for the moment
  issue threads exist.
- **AI handover brief** — `notifyHandoverBrief` is ready, but the brief generator itself is a
  GenAI feature tracked separately (see the `add/gen-ai` branch); wiring it here would collide.

**Bulk CSV member import sends nothing.** At the 500-row limit, mailing every imported member
inline would hold the Server Action open for minutes and trip Resend's rate limit. Roster imports
need a background job before they can notify.

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
  (faculty)/faculty/          oversight dashboard, event approvals, club activity, club
                    proposals (+ faculty access management)
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
    club-requests.ts         student club proposals; approval creates the Club and its
                              first Admin together (see Roles and provisioning)
    faculty.ts               grant/revoke institution-wide faculty access
  email/                    all outbound email, see Email notifications below
    client.ts                sendEmail() — the only place mail leaves the app: preference
                              enforcement, allowlist, dry-run, idempotency claim, audit row
    notifications.ts         one function per thing that happens (notifyMembershipApplied,
                              notifyEventScheduleChange, …); what domain code calls
    scheduled.ts             the cron sweeps: reminders, overdue nudges, announcement digest
    templates.ts             one pure function per email; data in, subject/html/text out
    render.ts                the shared HTML shell, escaping, and plain-text twin
    recipients.ts            who gets a given email (audience → roles, registrants, faculty)
    routes.ts                every in-app URL an email links to
    config.ts, unsubscribe.ts   env resolution; signed one-click opt-out links

lib/                      frontend-facing helpers, safe to import from client components
  seed-data.ts             static content not modeled as a DB table (landing-page copy, etc.)
  notification-prefs.ts    parse/default helpers for the profile's notification toggles
  interests.ts             parse/default helpers for signup interests and club recommendations
  event-tags.ts            parse/serialize helpers for comma-separated event tags
  format.ts                date/display formatting helpers
  utils.ts                 cn() class-name helper

prisma/
  schema.prisma            active schema
  migrations/, seed.ts

tests/
  unit/          Jest unit tests, mirrors the lib/ and backend/ source tree
  components/    Jest + Testing Library component tests (jsdom)
  integration/   Jest integration tests, live HTTP against app/api/ (needs a running app + database)
```

---

## Data model

Role is per-club, not global, as described in [Roles and access](#roles-and-access). Venues and Equipment are separate models, not a merged "Resource" type. The shape is shared exactly by `prisma/schema.prisma` and the live Postgres database via `backend/db/prisma.ts`.

`EmailLog` and `EmailVerificationToken` support [Email notifications](#email-notifications):
`EmailLog.dedupeKey` is unique and doubles as the idempotency lock for the cron sweeps, and only
the SHA-256 hash of each verification token is stored, so a database leak can't be replayed as a
valid link. `User.emailVerified` records the fact of verification; it is deliberately **not** a
login gate, since that would lock out every account created before this feature.

---

## Deployment

Production runs on Vercel, built from `main`. The database is Neon Postgres, connected through the Vercel Postgres integration, which manages `DATABASE_URL` automatically. `AUTH_SECRET` is set directly in the Vercel project's environment variables. `ALLOW_DEMO_SESSION` is intentionally left unset in production, so the role-preview shortcut never activates there.

To point production at a fresh database: `npx prisma db push --schema=prisma/schema.prisma` against the new `DATABASE_URL`, then `npx tsx prisma/seed.ts` to load clubs, events, and the demo accounts.

**Email.** `EMAIL_ENABLED` is left unset until a sender domain is verified, so production runs in
dry-run and sends nothing. `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` and `CRON_SECRET` go in the
same Vercel environment variables as `AUTH_SECRET`; the daily sweeps in `vercel.json` are inert
without `CRON_SECRET`. Full steps in [Going live on a real domain](#going-live-on-a-real-domain).

---

## License

This project is licensed under the [MIT License](LICENSE).
