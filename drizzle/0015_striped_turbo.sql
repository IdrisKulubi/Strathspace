
ALTER TABLE "profiles" ADD COLUMN "drinking_preference" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "workout_frequency" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "social_media_usage" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "sleeping_habits" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "personality_type" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "communication_style" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "love_language" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "zodiac_sign" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "visibility_mode" text DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "incognito_mode" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "discovery_paused" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "read_receipts_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "show_active_status" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "username" text;--> statement-breakpoint
CREATE INDEX "profile_username_idx" ON "profiles" USING btree ("username");