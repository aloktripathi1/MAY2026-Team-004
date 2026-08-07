-- Sangam — manual provisioning SQL for the Neon console
--
-- For bringing a live database to a usable state without prisma/seed.ts, which
-- DELETES EVERY TABLE before it writes and would wipe accounts people have
-- already signed up with. Nothing here deletes anything.
--
-- Two things to know before pasting any of this:
--
--   * `id` columns have NO database default. Prisma generates cuids in the
--     client, so the DDL has no DEFAULT — every raw INSERT must supply an id.
--     The statements below use gen_random_uuid()::text, which Postgres 13+
--     provides natively and Prisma reads back fine (id is just text).
--   * `updatedAt` is likewise client-managed on User, Event and ClubRequest, so
--     inserts into those tables must set it explicitly.
--
-- Run the blocks you need, in order. Every statement is idempotent: re-running
-- it changes nothing the second time.


-- ---------------------------------------------------------------------------
-- 1. Who exists right now
-- ---------------------------------------------------------------------------
-- Run this first. It tells you which of the blocks below you actually need.

SELECT
  (SELECT count(*) FROM "User")                            AS users,
  (SELECT count(*) FROM "User" WHERE "isFaculty")           AS faculty,
  (SELECT count(*) FROM "Club")                            AS clubs,
  (SELECT count(*) FROM "Membership")                      AS memberships,
  (SELECT count(*) FROM "Event")                           AS events,
  (SELECT count(*) FROM "User" WHERE "emailVerified" IS NULL) AS unverified;

-- The accounts you can act on, newest first:
SELECT "id", "email", "name", "isFaculty", "emailVerified" IS NOT NULL AS verified
FROM "User" ORDER BY "createdAt" DESC LIMIT 20;


-- ---------------------------------------------------------------------------
-- 2. Grant faculty
-- ---------------------------------------------------------------------------
-- Faculty is institution-wide: it approves events for every club and appoints
-- other faculty. This is the equivalent of scripts/bootstrap-faculty.ts.
--
-- The account must already exist — sign up in the app first. Replace the email.

UPDATE "User"
SET "isFaculty" = true
WHERE "email" = 'you@ds.study.iitm.ac.in';

-- Confirm (expect one row, isFaculty = t):
SELECT "email", "isFaculty" FROM "User" WHERE "email" = 'you@ds.study.iitm.ac.in';

-- Once one faculty account exists, appoint the rest in the app at
-- /faculty/club-requests rather than here — that path emails the person and
-- refuses to leave the institution with no reviewer.


-- ---------------------------------------------------------------------------
-- 3. Mark existing accounts as verified
-- ---------------------------------------------------------------------------
-- Only needed if you deploy with `prisma db push`, which never runs migration
-- SQL — so migration 20260806160000_backfill_email_verified does not apply.
--
-- The app already handles this on its own (an account that was never issued a
-- verification token is treated as predating the feature and admitted on first
-- sign-in). Run this if you would rather settle it in one go than let it
-- resolve per account.

UPDATE "User"
SET "emailVerified" = "createdAt"
WHERE "emailVerified" IS NULL;


-- ---------------------------------------------------------------------------
-- 4. Make someone the Admin of an existing club
-- ---------------------------------------------------------------------------
-- Only needed to break the chicken-and-egg on a database that has clubs but no
-- admins. Once one club has an Admin and one account has faculty, everything
-- else is reachable in the app: club proposals, member management, handover.
--
-- Set both values, then run. `ON CONFLICT` makes it safe to re-run and also
-- promotes an existing membership rather than failing on the unique constraint.

INSERT INTO "Membership" ("id", "userId", "clubId", "role", "status", "joinedAt")
SELECT
  gen_random_uuid()::text,
  u."id",
  c."id",
  'Admin'::"ClubRole",
  'Active'::"MembershipStatus",
  CURRENT_TIMESTAMP
FROM "User" u
CROSS JOIN "Club" c
WHERE u."email" = 'you@ds.study.iitm.ac.in'
  AND c."slug"  = 'codechef'
ON CONFLICT ("userId", "clubId")
DO UPDATE SET "role" = 'Admin'::"ClubRole", "status" = 'Active'::"MembershipStatus";

-- Confirm:
SELECT u."email", c."name", m."role", m."status"
FROM "Membership" m
JOIN "User" u ON u."id" = m."userId"
JOIN "Club" c ON c."id" = m."clubId"
WHERE u."email" = 'you@ds.study.iitm.ac.in';

-- Which club slugs exist:
SELECT "slug", "name" FROM "Club" ORDER BY "name";


-- ---------------------------------------------------------------------------
-- 5. Create a club, if the database has none
-- ---------------------------------------------------------------------------
-- Prefer the app: propose it from My clubs and approve it at
-- /faculty/club-requests, which creates the club AND its first Admin together.
-- This is the manual equivalent, for when there is no faculty account yet.
--
-- `banner` must be a CSS gradient and `hue` a number as text — the club cards
-- render straight from these, so a club with them empty looks broken.

INSERT INTO "Club" ("id", "slug", "name", "tagline", "category", "active", "hue", "emoji", "founded", "description", "banner")
VALUES (
  gen_random_uuid()::text,
  'photon',
  'Photon - Robotics & Electronics',
  'Bots, boards, and Saturday build nights.',
  'Technical'::"ClubCategory",
  true,
  '195',
  '⚡',
  '2026',
  'Line-followers to autonomous bots. Weekly build nights and sensor workshops.',
  'linear-gradient(135deg, oklch(0.32 0.09 195) 0%, oklch(0.15 0.04 195) 100%)'
)
ON CONFLICT ("slug") DO NOTHING;


-- ---------------------------------------------------------------------------
-- What not to do here
-- ---------------------------------------------------------------------------
-- * Do not create users by hand. `hashedPassword` is a bcrypt hash, so an
--   account inserted here has no usable password. Sign up in the app instead.
-- * Do not insert events by hand for a demo. Create them as a coordinator so
--   they pick up a slug, faculty approval and the notification emails.
-- * Do not run prisma/seed.ts against this database. It truncates every table.
