-- Add cancel-related fields to Subscription for better billing UX
ALTER TABLE "public"."Subscription"
  ADD COLUMN IF NOT EXISTS "cancelAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT FALSE;

