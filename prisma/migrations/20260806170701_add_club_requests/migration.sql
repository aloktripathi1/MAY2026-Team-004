-- CreateEnum
CREATE TYPE "ClubRequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateTable
CREATE TABLE "ClubRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "category" "ClubCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '◈',
    "status" "ClubRequestStatus" NOT NULL DEFAULT 'Pending',
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdClubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubRequest_status_createdAt_idx" ON "ClubRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ClubRequest_requestedById_idx" ON "ClubRequest"("requestedById");

-- AddForeignKey
ALTER TABLE "ClubRequest" ADD CONSTRAINT "ClubRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubRequest" ADD CONSTRAINT "ClubRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubRequest" ADD CONSTRAINT "ClubRequest_createdClubId_fkey" FOREIGN KEY ("createdClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
