/**
 * Restore Ask Sangam UI-tested tasks to their seed statuses.
 * Run: npx tsx scripts/restore-tested-tasks.ts --apply
 */
import { PrismaClient, type TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

/** Exact statuses from prisma/seed.ts team-account task defs. */
const SEED_STATUS_BY_ID: Record<string, TaskStatus> = {
  "team-task-pardhiv-1": "todo", // Confirm PA system booking
  "team-task-pardhiv-2": "todo", // Brief new volunteers on setup
  "team-task-pardhiv-3": "doing", // Test mic levels before soundcheck
  "team-task-pardhiv-4": "done", // Post rehearsal recap on Discord
  "team-task-pardhiv-5": "done", // Arrange green-room snacks
  "team-task-purnendu-1": "todo",
  "team-task-purnendu-2": "todo",
  "team-task-purnendu-3": "doing",
  "team-task-purnendu-4": "todo",
  "team-task-purnendu-5": "done",
};

async function main() {
  const ids = Object.keys(SEED_STATUS_BY_ID);
  const tasks = await prisma.task.findMany({
    where: { id: { in: ids } },
    include: {
      event: { select: { title: true } },
      assignee: { select: { name: true } },
    },
  });

  const drifted = tasks.filter((t) => t.status !== SEED_STATUS_BY_ID[t.id]);

  if (drifted.length === 0) {
    console.log("All team demo tasks already match seed status.");
    return;
  }

  console.log(`Restoring ${drifted.length} task(s) to seed status:\n`);
  for (const t of drifted) {
    const next = SEED_STATUS_BY_ID[t.id];
    console.log(`  [${t.id}] "${t.title}" (${t.assignee.name})  ${t.status} → ${next}`);
    if (apply) {
      await prisma.task.update({ where: { id: t.id }, data: { status: next } });
    }
  }

  if (apply) {
    console.log("\nDone. Open boards should show those tasks again.");
  } else {
    console.log("\nDry run only. Re-run with --apply to write.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
