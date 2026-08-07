-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Member', 'EventCoordinator', 'Admin');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'Member';
