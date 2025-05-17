-- Add anonymous mode fields to profiles table
ALTER TABLE "profiles" ADD COLUMN "anonymous" boolean DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "anonymous_avatar" text;
ALTER TABLE "profiles" ADD COLUMN "anonymous_reveal_requested" boolean DEFAULT false;

-- Create index for efficient filtering by anonymous status
CREATE INDEX "profile_anonymous_idx" ON "profiles" ("anonymous");

-- Migration notes:
-- This migration adds support for the Anonymous Mode feature with profile blurring
-- Users can toggle anonymous mode to hide their identity while matching
-- - anonymous: Boolean flag indicating if user has anonymous mode enabled
-- - anonymous_avatar: Custom avatar selection for anonymous profiles
-- - anonymous_reveal_requested: Tracks if user has requested to reveal identity to a match 