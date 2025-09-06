-- CreateEnum
CREATE TYPE "public"."JourneyStatus" AS ENUM ('TRIAL_ACTIVE', 'TRIAL_EXPIRED', 'INITIAL_PAID', 'FORM_SUBMITTED', 'AI_HEARING_ACTIVE', 'AI_SUMMARY_READY', 'PROMPT_READY', 'ACTIVE');

-- CreateTable
CREATE TABLE "public"."CustomerJourney" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tenantId" TEXT NOT NULL,
    "agentId" TEXT,
    "status" "public"."JourneyStatus" NOT NULL DEFAULT 'TRIAL_ACTIVE',
    "trialGrantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrialGrant" (
    "id" TEXT NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HearingForm" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "answersJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerJourneyId" TEXT,

    CONSTRAINT "HearingForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HearingChat" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerJourneyId" TEXT,

    CONSTRAINT "HearingChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HearingSummary" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "summaryJson" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerJourneyId" TEXT,

    CONSTRAINT "HearingSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PromptDraft" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "prevText" TEXT,
    "currentText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerJourneyId" TEXT,

    CONSTRAINT "PromptDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgentKnowledge" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerJourneyId" TEXT,

    CONSTRAINT "AgentKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" "public"."JourneyStatus",
    "toStatus" "public"."JourneyStatus",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerJourneyId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerJourney_trialGrantId_key" ON "public"."CustomerJourney"("trialGrantId");

-- CreateIndex
CREATE INDEX "CustomerJourney_tenantId_status_idx" ON "public"."CustomerJourney"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TrialGrant_lineUserId_key" ON "public"."TrialGrant"("lineUserId");

-- CreateIndex
CREATE INDEX "TrialGrant_tenantId_idx" ON "public"."TrialGrant"("tenantId");

-- CreateIndex
CREATE INDEX "HearingForm_journeyId_idx" ON "public"."HearingForm"("journeyId");

-- CreateIndex
CREATE INDEX "HearingChat_journeyId_createdAt_idx" ON "public"."HearingChat"("journeyId", "createdAt");

-- CreateIndex
CREATE INDEX "HearingSummary_journeyId_idx" ON "public"."HearingSummary"("journeyId");

-- CreateIndex
CREATE UNIQUE INDEX "HearingSummary_journeyId_version_key" ON "public"."HearingSummary"("journeyId", "version");

-- CreateIndex
CREATE INDEX "PromptDraft_journeyId_idx" ON "public"."PromptDraft"("journeyId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptDraft_journeyId_version_key" ON "public"."PromptDraft"("journeyId", "version");

-- CreateIndex
CREATE INDEX "AgentKnowledge_journeyId_idx" ON "public"."AgentKnowledge"("journeyId");

-- CreateIndex
CREATE INDEX "AuditLog_journeyId_createdAt_idx" ON "public"."AuditLog"("journeyId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."HearingForm" ADD CONSTRAINT "HearingForm_customerJourneyId_fkey" FOREIGN KEY ("customerJourneyId") REFERENCES "public"."CustomerJourney"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HearingChat" ADD CONSTRAINT "HearingChat_customerJourneyId_fkey" FOREIGN KEY ("customerJourneyId") REFERENCES "public"."CustomerJourney"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HearingSummary" ADD CONSTRAINT "HearingSummary_customerJourneyId_fkey" FOREIGN KEY ("customerJourneyId") REFERENCES "public"."CustomerJourney"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PromptDraft" ADD CONSTRAINT "PromptDraft_customerJourneyId_fkey" FOREIGN KEY ("customerJourneyId") REFERENCES "public"."CustomerJourney"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentKnowledge" ADD CONSTRAINT "AgentKnowledge_customerJourneyId_fkey" FOREIGN KEY ("customerJourneyId") REFERENCES "public"."CustomerJourney"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_customerJourneyId_fkey" FOREIGN KEY ("customerJourneyId") REFERENCES "public"."CustomerJourney"("id") ON DELETE SET NULL ON UPDATE CASCADE;
