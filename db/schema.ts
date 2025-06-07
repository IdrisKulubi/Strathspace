import { relations, sql } from "drizzle-orm";
import {
  timestamp,
  pgTable,
  text,
  integer,
  boolean,
  uuid,
  json,
  primaryKey,
  index,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

// First define all tables
export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(), 
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    role: text("role").$type<"user" | "admin">().default("user"),
    emailVerified: timestamp("emailVerified"),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastActive: timestamp("last_active").defaultNow().notNull(),
    isOnline: boolean("is_online").default(false),
    profilePhoto: text("profile_photo"),
    phoneNumber: text("phone_number").notNull(),
  },
  (table) => ({
    emailIdx: index("user_email_idx").on(table.email),
    createdAtIdx: index("user_created_at_idx").on(table.createdAt),
    lastActiveIdx: index("user_last_active_idx").on(table.lastActive),
  })
);

// Auth.js tables
export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// Extended user profiles
export const profiles = pgTable(
  "profiles",
  { 
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bio: text("bio"),
    age: integer("age"),
    gender: text("gender"),
    role: text("role").$type<"user" | "admin">().default("user"),
    interests: json("interests").$type<string[]>(),
    photos: json("photos").$type<string[]>(),
    isVisible: boolean("is_visible").default(true),
    lastActive: timestamp("last_active").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    isComplete: boolean("is_complete").default(false),
    profileCompleted: boolean("profile_completed").default(false),
    lookingFor: text("looking_for"),
    course: text("course"),
    yearOfStudy: integer("year_of_study"),
    instagram: text("instagram"),
    spotify: text("spotify"),
    snapchat: text("snapchat"),
    profilePhoto: text("profile_photo"),
    phoneNumber: text("phone_number"),
    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name").notNull().default(""),
    isMatch: boolean("is_match").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    anonymous: boolean("anonymous").default(false),
    anonymousAvatar: text("anonymous_avatar"),
    anonymousRevealRequested: boolean("anonymous_reveal_requested").default(false),
    drinkingPreference: text("drinking_preference"),
    workoutFrequency: text("workout_frequency"),
    socialMediaUsage: text("social_media_usage"),
    sleepingHabits: text("sleeping_habits"),
    personalityType: text("personality_type"),
    communicationStyle: text("communication_style"),
    loveLanguage: text("love_language"),
    zodiacSign: text("zodiac_sign"),
    visibilityMode: text("visibility_mode").default("standard"),
    incognitoMode: boolean("incognito_mode").default(false),
    discoveryPaused: boolean("discovery_paused").default(false),
    readReceiptsEnabled: boolean("read_receipts_enabled").default(true),
    showActiveStatus: boolean("show_active_status").default(true),
    username: text("username"),
  }
);

// Indexes for the profiles table (defined externally)
export const profileUserIdIdx = index("profile_user_id_idx").on(sql`user_id`);
export const profileIsVisibleIdx = index("profile_is_visible_idx").on(sql`is_visible`);
export const profileGenderIdx = index("profile_gender_idx").on(sql`gender`);
export const profileLastActiveIdx = index("profile_last_active_idx").on(sql`last_active`);
export const profileCompletedIdx = index("profile_completed_idx").on(sql`profile_completed`);
export const profileUsernameIdx = index("profile_username_idx").on(sql`username`);
export const profileAnonymousIdx = index("profile_anonymous_idx").on(sql`anonymous`);

// Swipes/Likes
export const swipes = pgTable(
  "swipes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    swiperId: text("swiper_id")
      .notNull()
      .references(() => users.id),
    swipedId: text("swiped_id")
      .notNull()
      .references(() => users.id),
    isLike: boolean("is_like").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    swiperIdx: index("swipe_swiper_idx").on(table.swiperId),
    swipedIdx: index("swipe_swiped_idx").on(table.swipedId),
    createdAtIdx: index("swipe_created_at_idx").on(table.createdAt),
    swipeComboIdx: index("swipe_combo_idx").on(table.swiperId, table.swipedId),
  })
);

// Matches
export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user1Id: text("user1_id")
      .notNull()
      .references(() => users.id),
    user2Id: text("user2_id")
      .notNull()
      .references(() => users.id),
    user1Typing: boolean("user1_typing").default(false),
    user2Typing: boolean("user2_typing").default(false),
    lastMessageAt: timestamp("last_message_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("match_users_idx").on(table.user1Id, table.user2Id),
    lastMessageIdx: index("last_message_idx").on(table.lastMessageAt),
  })
);

export const feedbacks = pgTable("feedbacks", {
  id: text("id").primaryKey().notNull(),
  name: text("name"),
  phoneNumber: text("phone_number"),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Messages
export const messages = pgTable(
  "messages",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    content: text("content").notNull(),
    matchId: uuid("match_id")
      .references(() => matches.id)
      .notNull(),
    senderId: text("sender_id")
      .references(() => users.id)
      .notNull(),
    status: text("status", { enum: ["sent", "delivered", "read"] })
      .default("sent")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    matchIdIdx: index("match_id_idx").on(table.matchId),
    senderIdIdx: index("sender_id_idx").on(table.senderId),
    createdAtIdx: index("created_at_idx").on(table.createdAt)
  })
);

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  })
}));

// Blocks
export const blocks = pgTable("blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  blockerId: text("blocker_id")
    .notNull()
    .references(() => users.id),
  blockedId: text("blocked_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Starred Profiles
export const starredProfiles = pgTable("starred_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  starredId: text("starred_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reports
export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.id),
  reportedUserId: text("reported_user_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(),
  status: text("status").$type<"PENDING" | "RESOLVED">().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  adminNotes: text("admin_notes"),
}, (table) => ({
  reportedIdx: index("reported_user_idx").on(table.reportedUserId),
  statusIdx: index("report_status_idx").on(table.status),
}));

// Profile Views
export const profileViews = pgTable("profile_views", {
  id: uuid("id").defaultRandom().primaryKey(),
  viewerId: text("viewer_id")
    .notNull()
    .references(() => users.id),
  viewedId: text("viewed_id")
    .notNull()
    .references(() => users.id),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
  source: text("source").$type<"VIEW_MORE" | "PROFILE_CARD" | "SEARCH" | "MATCHES">().default("VIEW_MORE"),
  viewDuration: integer("view_duration"), 
}, (table) => ({
  viewerIdx: index("profile_views_viewer_idx").on(table.viewerId),
  viewedIdx: index("profile_views_viewed_idx").on(table.viewedId),
  viewedAtIdx: index("profile_views_viewed_at_idx").on(table.viewedAt),
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  sentSwipes: many(swipes, { relationName: "swiperRelation" }),
  receivedSwipes: many(swipes, { relationName: "swipedRelation" }),
  matches1: many(matches, { relationName: "user1Relation" }),
  matches2: many(matches, { relationName: "user2Relation" }),
  starredProfiles: many(starredProfiles, {
    relationName: "userStarredProfiles",
  }),
  reports: many(reports, { relationName: "userReports" }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  messages: many(messages, { relationName: "matchMessages" }),
  user1: one(users, {
    fields: [matches.user1Id],
    references: [users.id],
  }),
  user2: one(users, {
    fields: [matches.user2Id],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
  }),
  reportedUser: one(users, {
    fields: [reports.reportedUserId],
    references: [users.id],
  }),
}));

export const profileViewsRelations = relations(profileViews, ({ one }) => ({
  viewer: one(users, {
    fields: [profileViews.viewerId],
    references: [users.id],
    relationName: "profileViewer",
  }),
  viewed: one(users, {
    fields: [profileViews.viewedId],
    references: [users.id],
    relationName: "profileViewed",
  }),
}));

// Then create type references at the end
export type Profile = typeof profiles.$inferSelect & {
  isMatch: boolean | null;
  userId: string;
  unreadMessages?: number;
  matchId?: string;
};

// StrathSpeed - Live Video Speed Dating Tables
export const speedDatingProfiles = pgTable(
  "speed_dating_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").default(false),
    anonymousMode: boolean("anonymous_mode").default(false),
    preferences: json("preferences").$type<{
      ageRange?: [number, number];
      genderPreference?: string;
      interests?: string[];
    }>(),
    totalSessions: integer("total_sessions").default(0),
    speedPoints: integer("speed_points").default(0),
    vibesReceived: integer("vibes_received").default(0),
    vibesSent: integer("vibes_sent").default(0),
    currentStreak: integer("current_streak").default(0),
    longestStreak: integer("longest_streak").default(0),
    badges: json("badges").$type<string[]>().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("speed_profile_user_id_idx").on(table.userId),
    isActiveIdx: index("speed_profile_active_idx").on(table.isActive),
  })
);

export const speedSessions = pgTable(
  "speed_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user1Id: text("user1_id")
      .notNull()
      .references(() => users.id),
    user2Id: text("user2_id")
      .notNull()
      .references(() => users.id),
    roomId: text("room_id").notNull().unique(),
    dailyRoomUrl: text("daily_room_url"),
    status: text("status").$type<"waiting" | "active" | "completed" | "abandoned" | "timeout">().default("waiting"),
    icebreakerId: uuid("icebreaker_id").references(() => icebreakerPrompts.id),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
    durationSeconds: integer("duration_seconds"),
    connectionQuality: text("connection_quality").$type<"excellent" | "good" | "fair" | "poor">(),
    user1Anonymous: boolean("user1_anonymous").default(false),
    user2Anonymous: boolean("user2_anonymous").default(false),
  },
  (table) => ({
    user1Idx: index("speed_session_user1_idx").on(table.user1Id),
    user2Idx: index("speed_session_user2_idx").on(table.user2Id),
    statusIdx: index("speed_session_status_idx").on(table.status),
    startedAtIdx: index("speed_session_started_idx").on(table.startedAt),
    roomIdIdx: uniqueIndex("speed_session_room_idx").on(table.roomId),
  })
);

export const sessionOutcomes = pgTable(
  "session_outcomes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => speedSessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    action: text("action").$type<"vibe" | "skip" | "report" | "timeout">().notNull(),
    reportReason: text("report_reason").$type<"inappropriate_content" | "harassment" | "spam" | "nudity" | "other">(),
    reportDescription: text("report_description"),
    pointsEarned: integer("points_earned").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index("session_outcome_session_idx").on(table.sessionId),
    userIdx: index("session_outcome_user_idx").on(table.userId),
    actionIdx: index("session_outcome_action_idx").on(table.action),
  })
);

export const icebreakerPrompts = pgTable(
  "icebreaker_prompts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    promptText: text("prompt_text").notNull(),
    category: text("category").$type<"fun" | "deep" | "creative" | "random" | "campus">().default("fun"),
    isActive: boolean("is_active").default(true),
    usageCount: integer("usage_count").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("icebreaker_category_idx").on(table.category),
    isActiveIdx: index("icebreaker_active_idx").on(table.isActive),
  })
);

export const speedReports = pgTable(
  "speed_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => speedSessions.id),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id),
    reportedUserId: text("reported_user_id")
      .notNull()
      .references(() => users.id),
    reportType: text("report_type").$type<"inappropriate_content" | "harassment" | "spam" | "nudity" | "fake_profile" | "other">().notNull(),
    description: text("description"),
    status: text("status").$type<"pending" | "reviewed" | "resolved" | "dismissed">().default("pending"),
    moderatorId: text("moderator_id").references(() => users.id),
    moderatorNotes: text("moderator_notes"),
    actionTaken: text("action_taken").$type<"warning" | "temp_ban" | "permanent_ban" | "no_action">(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => ({
    sessionIdx: index("speed_report_session_idx").on(table.sessionId),
    reporterIdx: index("speed_report_reporter_idx").on(table.reporterId),
    reportedIdx: index("speed_report_reported_idx").on(table.reportedUserId),
    statusIdx: index("speed_report_status_idx").on(table.status),
  })
);

export const speedBlocks = pgTable(
  "speed_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    blockerId: text("blocker_id")
      .notNull()
      .references(() => users.id),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason").$type<"inappropriate_behavior" | "harassment" | "not_interested" | "other">(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    blockerIdx: index("speed_block_blocker_idx").on(table.blockerId),
    blockedIdx: index("speed_block_blocked_idx").on(table.blockedId),
    comboIdx: uniqueIndex("speed_block_combo_idx").on(table.blockerId, table.blockedId),
  })
);

// StrathSpeed Relations
export const speedDatingProfilesRelations = relations(speedDatingProfiles, ({ one }) => ({
  user: one(users, {
    fields: [speedDatingProfiles.userId],
    references: [users.id],
  }),
}));

export const speedSessionsRelations = relations(speedSessions, ({ one, many }) => ({
  user1: one(users, {
    fields: [speedSessions.user1Id],
    references: [users.id],
    relationName: "speedSessionUser1",
  }),
  user2: one(users, {
    fields: [speedSessions.user2Id],
    references: [users.id],
    relationName: "speedSessionUser2",
  }),
  icebreaker: one(icebreakerPrompts, {
    fields: [speedSessions.icebreakerId],
    references: [icebreakerPrompts.id],
  }),
  outcomes: many(sessionOutcomes),
  reports: many(speedReports),
}));

export const sessionOutcomesRelations = relations(sessionOutcomes, ({ one }) => ({
  session: one(speedSessions, {
    fields: [sessionOutcomes.sessionId],
    references: [speedSessions.id],
  }),
  user: one(users, {
    fields: [sessionOutcomes.userId],
    references: [users.id],
  }),
}));

export const speedReportsRelations = relations(speedReports, ({ one }) => ({
  session: one(speedSessions, {
    fields: [speedReports.sessionId],
    references: [speedSessions.id],
  }),
  reporter: one(users, {
    fields: [speedReports.reporterId],
    references: [users.id],
    relationName: "speedReportReporter",
  }),
  reportedUser: one(users, {
    fields: [speedReports.reportedUserId],
    references: [users.id],
    relationName: "speedReportReported",
  }),
  moderator: one(users, {
    fields: [speedReports.moderatorId],
    references: [users.id],
    relationName: "speedReportModerator",
  }),
}));

// Export types
export type SpeedDatingProfile = typeof speedDatingProfiles.$inferSelect;
export type SpeedSession = typeof speedSessions.$inferSelect;
export type SessionOutcome = typeof sessionOutcomes.$inferSelect;
export type IcebreakerPrompt = typeof icebreakerPrompts.$inferSelect;
export type SpeedReport = typeof speedReports.$inferSelect;

// Export the Message type if needed
export type Message = typeof messages.$inferSelect;

export type ProfileView = typeof profileViews.$inferSelect;

