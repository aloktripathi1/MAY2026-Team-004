-- Accounts created before email verification existed have emailVerified NULL.
-- Once REQUIRE_EMAIL_VERIFICATION is switched on, that NULL would refuse them
-- sign-in for an email they were never asked to confirm — including every
-- seeded demo account. Treat anything that predates this migration as
-- verified; the gate then only ever applies to accounts created after it.
UPDATE "User" SET "emailVerified" = "createdAt" WHERE "emailVerified" IS NULL;
