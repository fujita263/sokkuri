-- AlterTable
ALTER TABLE "public"."TrialGrant" ADD COLUMN     "userId" TEXT,
ALTER COLUMN "lineUserId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "TrialGrant_userId_startAt_idx" ON "public"."TrialGrant"("userId", "startAt");
