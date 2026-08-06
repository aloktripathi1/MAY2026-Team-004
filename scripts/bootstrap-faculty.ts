/**
 * Grants faculty status to an existing account, from the command line.
 *
 * This is how the *first* faculty account comes to exist. Faculty is
 * institution-wide — it approves events for every club and appoints other
 * faculty — so it is deliberately not reachable from the web at all: there is no
 * signup option, no self-service, nothing to trick. Creating the first one
 * requires database access, which is exactly the intended bar.
 *
 * After the first, faculty appoint each other in the app under
 * /faculty/faculty-access, and this script is only needed again if every faculty
 * account is somehow lost.
 *
 * Usage (from the repo root):
 *   npx tsx scripts/bootstrap-faculty.ts you@ds.study.iitm.ac.in
 *   npx tsx scripts/bootstrap-faculty.ts --list
 *
 * Against production, run it with that database's URL:
 *   npx vercel env pull .env.production.local --environment=production
 *   DATABASE_URL="$(grep '^DATABASE_URL=' .env.production.local | cut -d= -f2- | tr -d '"')" \
 *     npx tsx scripts/bootstrap-faculty.ts you@ds.study.iitm.ac.in
 *
 * The account must already exist — sign up in the app first, then run this.
 */
import { prisma } from "@/backend/db/prisma";
import { grantFaculty, listFaculty } from "@/backend/domain/faculty";

async function main() {
  const arg = process.argv[2];

  if (!arg || arg === "--help" || arg === "-h") {
    console.error("Usage: npx tsx scripts/bootstrap-faculty.ts <email> | --list");
    process.exit(1);
  }

  if (arg === "--list") {
    const faculty = await listFaculty();
    if (faculty.length === 0) {
      console.log("No faculty accounts yet. Grant one with:");
      console.log("  npx tsx scripts/bootstrap-faculty.ts <email>");
    } else {
      console.log(`${faculty.length} faculty account(s):`);
      for (const f of faculty) console.log(`  ${f.email.padEnd(38)} ${f.name}`);
    }
    return;
  }

  const result = await grantFaculty(arg);

  if (!result.ok) {
    console.error(`✗ ${result.message}`);
    process.exit(1);
  }

  if (result.changed) {
    console.log(`✓ ${result.user.name} <${result.user.email}> is now faculty.`);
    console.log("  They can review event approvals and appoint other faculty at /faculty.");
  } else {
    console.log(`• ${result.user.email} was already faculty. Nothing to do.`);
  }

  const total = await prisma.user.count({ where: { isFaculty: true } });
  console.log(`  ${total} faculty account(s) in total.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
