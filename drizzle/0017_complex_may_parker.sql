CREATE TABLE "icebreaker_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_text" text NOT NULL,
	"category" text DEFAULT 'fun',
	"is_active" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "session_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"report_reason" text,
	"report_description" text,
	"points_earned" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "speed_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "speed_dating_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"anonymous_mode" boolean DEFAULT false,
	"preferences" json,
	"total_sessions" integer DEFAULT 0,
	"speed_points" integer DEFAULT 0,
	"vibes_received" integer DEFAULT 0,
	"vibes_sent" integer DEFAULT 0,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"badges" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "speed_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"reporter_id" text NOT NULL,
	"reported_user_id" text NOT NULL,
	"report_type" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending',
	"moderator_id" text,
	"moderator_notes" text,
	"action_taken" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
CREATE TABLE "speed_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user1_id" text NOT NULL,
	"user2_id" text NOT NULL,
	"room_id" text NOT NULL,
	"daily_room_url" text,
	"status" text DEFAULT 'waiting',
	"icebreaker_id" uuid,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"duration_seconds" integer,
	"connection_quality" text,
	"user1_anonymous" boolean DEFAULT false,
	"user2_anonymous" boolean DEFAULT false,
	CONSTRAINT "speed_sessions_room_id_unique" UNIQUE("room_id")
);
ALTER TABLE "session_outcomes" ADD CONSTRAINT "session_outcomes_session_id_speed_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."speed_sessions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "session_outcomes" ADD CONSTRAINT "session_outcomes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "speed_blocks" ADD CONSTRAINT "speed_blocks_blocker_id_user_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "speed_blocks" ADD CONSTRAINT "speed_blocks_blocked_id_user_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "speed_dating_profiles" ADD CONSTRAINT "speed_dating_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "speed_reports" ADD CONSTRAINT "speed_reports_session_id_speed_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."speed_sessions"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "speed_reports" ADD CONSTRAINT "speed_reports_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "speed_reports" ADD CONSTRAINT "speed_reports_reported_user_id_user_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "speed_reports" ADD CONSTRAINT "speed_reports_moderator_id_user_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "speed_sessions" ADD CONSTRAINT "speed_sessions_user1_id_user_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "speed_sessions" ADD CONSTRAINT "speed_sessions_user2_id_user_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "speed_sessions" ADD CONSTRAINT "speed_sessions_icebreaker_id_icebreaker_prompts_id_fk" FOREIGN KEY ("icebreaker_id") REFERENCES "public"."icebreaker_prompts"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "icebreaker_category_idx" ON "icebreaker_prompts" USING btree ("category");
CREATE INDEX "icebreaker_active_idx" ON "icebreaker_prompts" USING btree ("is_active");
CREATE INDEX "session_outcome_session_idx" ON "session_outcomes" USING btree ("session_id");
CREATE INDEX "session_outcome_user_idx" ON "session_outcomes" USING btree ("user_id");
CREATE INDEX "session_outcome_action_idx" ON "session_outcomes" USING btree ("action");
CREATE INDEX "speed_block_blocker_idx" ON "speed_blocks" USING btree ("blocker_id");
CREATE INDEX "speed_block_blocked_idx" ON "speed_blocks" USING btree ("blocked_id");
CREATE UNIQUE INDEX "speed_block_combo_idx" ON "speed_blocks" USING btree ("blocker_id","blocked_id");
CREATE INDEX "speed_profile_user_id_idx" ON "speed_dating_profiles" USING btree ("user_id");
CREATE INDEX "speed_profile_active_idx" ON "speed_dating_profiles" USING btree ("is_active");
CREATE INDEX "speed_report_session_idx" ON "speed_reports" USING btree ("session_id");
CREATE INDEX "speed_report_reporter_idx" ON "speed_reports" USING btree ("reporter_id");
CREATE INDEX "speed_report_reported_idx" ON "speed_reports" USING btree ("reported_user_id");
CREATE INDEX "speed_report_status_idx" ON "speed_reports" USING btree ("status");
CREATE INDEX "speed_session_user1_idx" ON "speed_sessions" USING btree ("user1_id");
CREATE INDEX "speed_session_user2_idx" ON "speed_sessions" USING btree ("user2_id");
CREATE INDEX "speed_session_status_idx" ON "speed_sessions" USING btree ("status");
CREATE INDEX "speed_session_started_idx" ON "speed_sessions" USING btree ("started_at");
CREATE UNIQUE INDEX "speed_session_room_idx" ON "speed_sessions" USING btree ("room_id");