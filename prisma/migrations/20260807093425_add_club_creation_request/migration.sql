-- CreateTable
CREATE TABLE "ClubCreationRequest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "category" "ClubCategory" NOT NULL,
    "hue" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "founded" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "banner" TEXT NOT NULL,
    "photo" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "ClubCreationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubCreationRequest_slug_key" ON "ClubCreationRequest"("slug");

-- CreateIndex
CREATE INDEX "ClubCreationRequest_status_idx" ON "ClubCreationRequest"("status");

-- CreateIndex
CREATE INDEX "ClubCreationRequest_creatorId_idx" ON "ClubCreationRequest"("creatorId");

-- AddForeignKey
ALTER TABLE "ClubCreationRequest" ADD CONSTRAINT "ClubCreationRequest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
