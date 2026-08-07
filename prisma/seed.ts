import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Production-level seed: Minimal setup only.
 * - Creates a super-admin account for bootstrapping
 * - No bulk data or test accounts
 * - Real users sign up through the app
 */
async function main() {
  console.log("🌱 Starting production seed...");

  const adminPassword = await bcrypt.hash("sangam", 10);

  // Create super-admin faculty account for bootstrapping
  const faculty = await prisma.user.upsert({
    where: { email: "faculty@ds.study.iitm.ac.in" },
    update: {},
    create: {
      email: "faculty@ds.study.iitm.ac.in",
      name: "Faculty Coordinator",
      hashedPassword: adminPassword,
      rollNumber: null,
      isFaculty: true,
      role: "Admin",
      interests: "[]",
    },
  });

  console.log("✅ Seed complete");
  console.log("\n📋 Bootstrap Faculty Account:");
  console.log("━".repeat(50));
  console.log(`Email:    ${faculty.email}`);
  console.log(`Password: sangam`);
  console.log(`Role:     Faculty (isFaculty=true)`);
  console.log("━".repeat(50));
  console.log("\n📖 Next Steps:");
  console.log("1. Login with the admin account above");
  console.log("2. Create clubs and events through the UI");
  console.log("3. Invite other users/faculty as needed");
  console.log("\n💡 To create more faculty accounts:");
  console.log("   - Use the admin panel (when implemented)");
  console.log("   - Or update database directly: UPDATE \"User\" SET isFaculty=true WHERE email='...'");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
