CREATE TABLE "profile_modes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"dating_enabled" boolean DEFAULT false,
	"friends_enabled" boolean DEFAULT false,
	"dating_profile_completed" boolean DEFAULT false,
	"friends_profile_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

DROP INDEX "profile_completed_idx";
DROP INDEX "profile_user_id_idx";
DROP INDEX "profile_username_idx";
ALTER TABLE "profiles" ALTER COLUMN "first_name" DROP DEFAULT;
ALTER TABLE "profiles" ALTER COLUMN "last_name" DROP DEFAULT;
ALTER TABLE "profile_views" ADD COLUMN "source" text DEFAULT 'VIEW_MORE';
ALTER TABLE "profile_views" ADD COLUMN "view_duration" integer;
ALTER TABLE "profiles" ADD COLUMN "study_preferences" json;
ALTER TABLE "profiles" ADD COLUMN "academic_focus" text;
ALTER TABLE "profiles" ADD COLUMN "study_availability" json;
ALTER TABLE "profiles" ADD COLUMN "project_interests" json;
ALTER TABLE "profiles" ADD COLUMN "relationship_goals" text;
ALTER TABLE "profile_modes" ADD CONSTRAINT "profile_modes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "profile_modes_user_id_idx" ON "profile_modes" USING btree ("user_id");
CREATE INDEX "profile_views_viewed_at_idx" ON "profile_views" USING btree ("viewed_at");
CREATE UNIQUE INDEX "profile_user_id_idx" ON "profiles" USING btree ("user_id");
CREATE UNIQUE INDEX "profile_username_idx" ON "profiles" USING btree ("username");
ALTER TABLE "profiles" DROP COLUMN "is_complete";
ALTER TABLE "profiles" DROP COLUMN "profile_completed";
ALTER TABLE "profiles" DROP COLUMN "phone_number";
ALTER TABLE "profiles" DROP COLUMN "is_match";